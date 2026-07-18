using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.Common;
using TeamManager.Api.Application.DTOs;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

// Shared by every AI-backed generator service (quiz questions, Wordle words, jokes, win stories,
// timesheet analysis) -- separates "which connection to call, with what auth/model/response
// shape" (ApiRequestConfig.IsAiConnection) from "what to actually ask it" (AiPrompt, looked up by
// the same Key the old per-action ApiRequestConfig.Action used to be). Replaces the ~200 lines of
// copy-pasted resolve/log/call/parse logic each of those services used to carry on its own.
public class AiPromptExecutorService(AppDbContext db)
{
    // promptParams are the prompt's OWN placeholders (e.g. {topic}/{angle} for quiz questions,
    // {wordLength}/{recentWords} for Wordle) -- substituted into SystemPrompt/UserMessageTemplate
    // first, as plain text. The fully-resolved system/user strings are then JSON-escaped (quotes,
    // newlines, etc. made safe) WITHOUT adding surrounding quotes, matching every other action's
    // convention in this app -- the connection's BodyTemplate provides its own quotes, e.g.:
    //   "system": "{systemPrompt}",
    //   "messages": [{ "role": "user", "content": "{userMessage}" }]
    public async Task<string?> ExecuteAsync(
        string promptKey, Dictionary<string, string> promptParams, string sourceType, string label, string? sourceId = null)
    {
        var prompt = await db.AiPrompts.Include(p => p.Connection)
            .FirstOrDefaultAsync(p => p.Key == promptKey && p.Enabled);
        if (prompt?.Connection is null || !prompt.Connection.Enabled) return null;

        var config = prompt.Connection;

        var systemPrompt = prompt.SystemPrompt;
        var userMessage = prompt.UserMessageTemplate;
        foreach (var (k, v) in promptParams)
        {
            systemPrompt = systemPrompt.Replace($"{{{k}}}", v);
            userMessage = userMessage.Replace($"{{{k}}}", v);
        }

        var parameters = string.IsNullOrWhiteSpace(config.ParametersJson)
            ? new Dictionary<string, string>()
            : JsonSerializer.Deserialize<Dictionary<string, string>>(config.ParametersJson) ?? new();
        var headers = string.IsNullOrWhiteSpace(config.HeadersJson)
            ? new Dictionary<string, string>()
            : JsonSerializer.Deserialize<Dictionary<string, string>>(config.HeadersJson) ?? new();
        var secretHeaders = string.IsNullOrWhiteSpace(config.SecretHeadersJson)
            ? new Dictionary<string, string>()
            : JsonSerializer.Deserialize<Dictionary<string, string>>(config.SecretHeadersJson) ?? new();
        var mappingOpts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var mapping = string.IsNullOrWhiteSpace(config.MappingJson)
            ? new MappingConfigDto()
            : JsonSerializer.Deserialize<MappingConfigDto>(config.MappingJson, mappingOpts) ?? new();
        var textPath = mapping.TextResponsePath;

        // JsonSerializer.Serialize always wraps the result in quotes ("...escaped..."); strip
        // them since the BodyTemplate supplies its own quotes around the placeholder.
        parameters["systemPrompt"] = JsonEscapeInner(systemPrompt);
        parameters["userMessage"] = JsonEscapeInner(userMessage);

        var publicConfigVars = await ConfigVariableResolver.LoadPublicAsync(db);
        var allConfigVars = await ConfigVariableResolver.LoadAsync(db);

        string ResolveForStorage(string template)
        {
            var result = ConfigVariableResolver.Apply(template ?? "", publicConfigVars);
            foreach (var (k, v) in parameters)
                result = result.Replace($"{{{k}}}", v);
            return result;
        }

        string ResolveForExecution(string template)
        {
            var result = ConfigVariableResolver.Apply(template ?? "", allConfigVars);
            foreach (var (k, v) in parameters)
                result = result.Replace($"{{{k}}}", v);
            return result;
        }

        var evt = new ApiSyncEvent
        {
            Action = prompt.Key,
            ConfigName = config.Name,
            Label = label,
            SourceType = sourceType,
            SourceId = sourceId,
            HttpMethod = config.Method.ToUpper(),
            ResolvedUrl = ResolveForStorage(config.Url),
            ResolvedHeadersJson = JsonSerializer.Serialize(headers.ToDictionary(kvp => kvp.Key, kvp => ResolveForStorage(kvp.Value))),
            ResolvedBody = ResolveForStorage(config.BodyTemplate ?? ""),
            BodyFormat = config.BodyFormat ?? "json",
            Status = "pending"
        };
        db.ApiSyncEvents.Add(evt);
        await db.SaveChangesAsync();

        try
        {
            var executionHeaders = headers.ToDictionary(kvp => kvp.Key, kvp => ResolveForExecution(kvp.Value));
            foreach (var (k, v) in secretHeaders) executionHeaders[k] = v;
            var executionUrl = ResolveForExecution(config.Url);
            var executionBody = ResolveForExecution(config.BodyTemplate ?? "");

            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(12) };
            foreach (var (k, v) in executionHeaders)
                client.DefaultRequestHeaders.TryAddWithoutValidation(k, v);

            var mediaType = (config.BodyFormat ?? "json") == "urlencoded" ? "application/x-www-form-urlencoded" : "application/json";
            var response = config.Method.ToUpper() == "GET"
                ? await client.GetAsync(executionUrl)
                : await client.PostAsync(executionUrl, new StringContent(executionBody, Encoding.UTF8, mediaType));

            var responseBody = await response.Content.ReadAsStringAsync();
            evt.ResponseStatus = (int)response.StatusCode;
            evt.ResponseBody = responseBody;
            evt.SentAt = DateTimeOffset.UtcNow;

            if (!response.IsSuccessStatusCode)
            {
                evt.Status = "failed";
                await db.SaveChangesAsync();
                return null;
            }

            var extracted = JsonPath.ExtractText(responseBody, textPath ?? "");
            if (string.IsNullOrWhiteSpace(extracted))
            {
                evt.Status = "failed";
                await db.SaveChangesAsync();
                return null;
            }

            evt.Status = "sent";
            await db.SaveChangesAsync();
            return extracted;
        }
        catch (Exception ex)
        {
            evt.Status = "failed";
            evt.ResponseBody = ex.Message;
            evt.SentAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
            return null;
        }
    }

    // JsonSerializer.Serialize(string) always produces a quoted, fully-escaped JSON string
    // literal ("..."); this strips the surrounding quotes it adds, leaving just the escaped
    // inner content for templates that already supply their own quotes around the placeholder.
    private static string JsonEscapeInner(string value)
    {
        var serialized = JsonSerializer.Serialize(value);
        return serialized[1..^1];
    }
}
