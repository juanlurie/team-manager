using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

// Shared by the Win of the Week Quiz Duel tiebreaker and the standalone Quiz Game --
// generates one 4-option trivia question, via AI if a "GenerateQuizQuestion" ApiRequestConfig
// is configured and enabled, falling back to a built-in question bank otherwise.
public class QuizQuestionGeneratorService(AppDbContext db)
{
    private static readonly (string Question, string[] Options, int CorrectIndex)[] FallbackQuestions =
    [
        ("What is the capital of France?", ["Paris", "Berlin", "Madrid", "Rome"], 0),
        ("How many continents are there on Earth?", ["5", "6", "7", "8"], 2),
        ("What planet is known as the Red Planet?", ["Venus", "Mars", "Jupiter", "Saturn"], 1),
        ("Who wrote 'Romeo and Juliet'?", ["Charles Dickens", "Mark Twain", "William Shakespeare", "Jane Austen"], 2),
        ("What is the largest ocean on Earth?", ["Atlantic", "Indian", "Arctic", "Pacific"], 3),
        ("How many sides does a hexagon have?", ["5", "6", "7", "8"], 1),
        ("What gas do plants mainly absorb from the atmosphere?", ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], 2),
        ("What is the smallest prime number?", ["0", "1", "2", "3"], 2),
        ("Which country is home to the kangaroo?", ["South Africa", "Australia", "Brazil", "India"], 1),
        ("How many minutes are in a full day?", ["1200", "1440", "1000", "1800"], 1),
        ("Who painted the Mona Lisa?", ["Vincent van Gogh", "Leonardo da Vinci", "Pablo Picasso", "Claude Monet"], 1),
        ("What is the chemical symbol for gold?", ["Go", "Gd", "Au", "Ag"], 2),
        ("Which language has the most native speakers worldwide?", ["English", "Spanish", "Hindi", "Mandarin Chinese"], 3),
        ("How many strings does a standard guitar have?", ["4", "5", "6", "7"], 2),
        ("What is the tallest mountain in the world?", ["K2", "Kilimanjaro", "Everest", "Denali"], 2),
    ];

    private static (string Question, string[] Options, int CorrectIndex) RandomFallback()
    {
        var q = FallbackQuestions[Random.Shared.Next(FallbackQuestions.Length)];
        return (q.Question, q.Options, q.CorrectIndex);
    }

    public async Task<(string Question, string[] Options, int CorrectIndex)> GenerateAsync(string sourceType, string label)
    {
        var config = await db.ApiRequestConfigs.FirstOrDefaultAsync(c => c.Action == "GenerateQuizQuestion" && c.Enabled);
        if (config is null) return RandomFallback();

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

        parameters["seed"] = Guid.NewGuid().ToString("N")[..8];

        // Storage: non-secret values only -- stored URL/body/headers are safe to return to clients.
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
            SourceType = sourceType,
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
                return RandomFallback();
            }

            var extracted = WinOfTheWeekService.ExtractTextAtPath(responseBody, textPath ?? "");
            var parsed = string.IsNullOrWhiteSpace(extracted) ? null : JsonSerializer.Deserialize<QuizGenResult>(extracted, mappingOpts);
            if (parsed is null || string.IsNullOrWhiteSpace(parsed.Question) || parsed.Options is null || parsed.Options.Length != 4
                || parsed.CorrectIndex < 0 || parsed.CorrectIndex > 3)
            {
                evt.Status = "failed";
                await db.SaveChangesAsync();
                return RandomFallback();
            }

            evt.Status = "sent";
            await db.SaveChangesAsync();
            return (parsed.Question, parsed.Options, parsed.CorrectIndex);
        }
        catch (Exception ex)
        {
            evt.Status = "failed";
            evt.ResponseBody = ex.Message;
            evt.SentAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
            return RandomFallback();
        }
    }

    private record QuizGenResult(string Question, string[] Options, int CorrectIndex);
}
