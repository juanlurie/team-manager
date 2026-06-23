using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

// Generates the secret word for a Wordle session via AI if a "GenerateWordleWord" ApiRequestConfig
// is configured and enabled, falling back to WordleWordBank's curated list otherwise -- same
// shape as QuizQuestionGeneratorService.
public class WordleWordGeneratorService(AppDbContext db)
{
    private const int MaxGenerationAttempts = 3;
    private const int RecentWordsBufferSize = 20;

    // Process-lifetime, deliberately global rather than per-session -- just enough to stop the AI
    // repeating itself in quick succession, not a strict per-game history.
    private static readonly object StateLock = new();
    private static readonly Queue<string> RecentWords = new();

    private static string RecordAndGetRecentCsv(string? justUsed)
    {
        lock (StateLock)
        {
            var snapshot = RecentWords.ToArray();
            if (justUsed is not null)
            {
                RecentWords.Enqueue(justUsed);
                while (RecentWords.Count > RecentWordsBufferSize) RecentWords.Dequeue();
            }
            return string.Join(", ", snapshot);
        }
    }

    public async Task<string> GenerateWordAsync()
    {
        var config = await db.ApiRequestConfigs.FirstOrDefaultAsync(c => c.Action == "GenerateWordleWord" && c.Enabled);
        if (config is null) return WordleWordBank.RandomWord();

        for (var attempt = 1; attempt <= MaxGenerationAttempts; attempt++)
        {
            var recentCsv = RecordAndGetRecentCsv(null);
            var result = await TryGenerateOnceAsync(config, $"Wordle word (attempt {attempt})", recentCsv);
            if (result is null) continue; // call/parse failed -- try again

            var word = result.Trim().ToUpperInvariant();
            if (word.Length != WordleWordBank.WordLength || !word.All(char.IsAsciiLetterUpper))
                continue; // AI didn't follow the length/alphabet constraint -- retry

            RecordAndGetRecentCsv(word);
            return word;
        }

        return WordleWordBank.RandomWord();
    }

    private async Task<string?> TryGenerateOnceAsync(ApiRequestConfig config, string label, string recentWordsCsv)
    {
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

        parameters["wordLength"] = WordleWordBank.WordLength.ToString();
        parameters["recentWords"] = recentWordsCsv;

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
            Action = config.Action,
            ConfigName = config.Name,
            Label = label,
            SourceType = "Wordle",
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
            var parsed = string.IsNullOrWhiteSpace(extracted) ? null : JsonSerializer.Deserialize<WordleGenResult>(extracted, mappingOpts);
            if (parsed is null || string.IsNullOrWhiteSpace(parsed.Word))
            {
                evt.Status = "failed";
                await db.SaveChangesAsync();
                return null;
            }

            evt.Status = "sent";
            await db.SaveChangesAsync();
            return parsed.Word;
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

    private record WordleGenResult(string Word);
}
