using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

// Generates the secret word for a Wordle session via AI if a "GenerateWordleWord" AiPrompt is
// configured and enabled, falling back to WordleWordBank's curated list otherwise -- same shape
// as QuizQuestionGeneratorService.
public class WordleWordGeneratorService(AppDbContext db, AiPromptExecutorService executor)
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
        var hasPrompt = await db.AiPrompts.AnyAsync(p => p.Key == "GenerateWordleWord" && p.Enabled);
        if (!hasPrompt) return WordleWordBank.RandomWord();

        for (var attempt = 1; attempt <= MaxGenerationAttempts; attempt++)
        {
            var recentCsv = RecordAndGetRecentCsv(null);
            var result = await TryGenerateOnceAsync($"Wordle word (attempt {attempt})", recentCsv);
            if (result is null) continue; // call/parse failed -- try again

            var word = result.Trim().ToUpperInvariant();
            if (word.Length != WordleWordBank.WordLength || !word.All(char.IsAsciiLetterUpper))
                continue; // AI didn't follow the length/alphabet constraint -- retry

            RecordAndGetRecentCsv(word);
            return word;
        }

        return WordleWordBank.RandomWord();
    }

    private async Task<string?> TryGenerateOnceAsync(string label, string recentWordsCsv)
    {
        var promptParams = new Dictionary<string, string>
        {
            ["wordLength"] = WordleWordBank.WordLength.ToString(),
            ["recentWords"] = recentWordsCsv
        };

        var extracted = await executor.ExecuteAsync("GenerateWordleWord", promptParams, "Wordle", label);
        if (extracted is null) return null;

        try
        {
            var parsed = JsonSerializer.Deserialize<WordleGenResult>(extracted, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            return string.IsNullOrWhiteSpace(parsed?.Word) ? null : parsed.Word;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private record WordleGenResult(string Word);
}
