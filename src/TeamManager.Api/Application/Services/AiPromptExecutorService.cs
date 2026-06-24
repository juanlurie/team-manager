using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
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
    // first, as plain text. The fully-resolved system/user strings are then JSON-encoded (they can
    // contain quotes/newlines once admins are typing real prompt text into a textarea) and
    // substituted into the connection's BodyTemplate, which is expected to reference them as
    // {systemPrompt}/{userMessage} WITHOUT surrounding quotes in the template, e.g.:
    //   "system": {systemPrompt},
    //   "messages": [{ "role": "user", "content": {userMessage} }]
    // since the substituted value already includes its own quotes.
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
        var mappingOpts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var mapping = string.IsNullOrWhiteSpace(config.MappingJson)
            ? new MappingConfigDto()
            : JsonSerializer.Deserialize<MappingConfigDto>(config.MappingJson, mappingOpts) ?? new();
        var textPath = mapping.TextResponsePath;

        // JSON-encode (includes the surrounding quotes) so the connection's BodyTemplate can
        // reference these as bare placeholders without needing its own quotes around them.
        parameters["systemPrompt"] = JsonSerializer.Serialize(systemPrompt);
        parameters["userMessage"] = JsonSerializer.Serialize(userMessage);

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

            var extracted = WinOfTheWeekService.ExtractTextAtPath(responseBody, textPath ?? "");
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
}
