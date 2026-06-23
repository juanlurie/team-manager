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
    private const int MaxGenerationAttempts = 3;
    private const int RecentTopicsBufferSize = 10;
    private const int SeenQuestionsBufferSize = 500;

    private static readonly string[] TopicPool =
    [
        "ancient history", "world geography", "space and astronomy", "marine biology",
        "classical music", "pop culture and movies", "video games", "sports records",
        "world cuisine and food", "greek mythology", "norse mythology", "famous inventions",
        "computer science", "human anatomy", "world currencies", "board games and card games",
        "architecture and landmarks", "literature and authors", "wildlife and animals",
        "chemistry and elements", "olympic history", "art history", "language and etymology",
        "weather and natural phenomena",
    ];

    private static readonly string[] AngleModifiers =
    [
        "an obscure fact about", "a classic trivia question about", "a tricky question about",
        "a fun fact about", "a lesser-known detail about", "a numbers-based question about",
        "a who-or-what question about", "a surprising fact about",
    ];

    // Used instead of AngleModifiers when a difficulty tier is supplied (Quiz Game's Millionaire
    // mode) -- escalates from generally-known facts up to genuinely obscure/expert-level ones.
    private static readonly Dictionary<string, string[]> DifficultyAngleModifiers = new()
    {
        ["easy"] = ["a classic, widely-known fact about", "an easy, well-known question about", "a fun, simple fact about"],
        ["medium"] = ["a moderately tricky question about", "a lesser-known detail about", "a numbers-based question about"],
        ["hard"] = ["an obscure, expert-level fact about", "an extremely tricky question about", "a deep-cut detail about"],
    };

    // Process-lifetime state shared across all callers (WoW Quiz Duel + standalone Quiz Game) --
    // deliberately global rather than per-session, since the goal is just to avoid the AI repeating
    // itself in quick succession, not to track history per game.
    private static readonly object StateLock = new();
    private static readonly Queue<string> RecentTopics = new();
    private static readonly HashSet<string> SeenQuestions = new();

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

    // Used instead of FallbackQuestions when a difficulty tier is supplied and no AI config is
    // enabled -- so Millionaire mode's difficulty still escalates even with the AI integration
    // off, rather than drawing from one flat, undifferentiated pool.
    private static readonly Dictionary<string, (string Question, string[] Options, int CorrectIndex)[]> FallbackQuestionsByTier = new()
    {
        ["easy"] =
        [
            ("What is the capital of France?", ["Paris", "Berlin", "Madrid", "Rome"], 0),
            ("What planet is known as the Red Planet?", ["Venus", "Mars", "Jupiter", "Saturn"], 1),
            ("What is the largest ocean on Earth?", ["Atlantic", "Indian", "Arctic", "Pacific"], 3),
            ("How many sides does a hexagon have?", ["5", "6", "7", "8"], 1),
            ("Who painted the Mona Lisa?", ["Vincent van Gogh", "Leonardo da Vinci", "Pablo Picasso", "Claude Monet"], 1),
            ("What is the tallest mountain in the world?", ["K2", "Kilimanjaro", "Everest", "Denali"], 2),
            ("How many continents are there on Earth?", ["5", "6", "7", "8"], 2),
            ("Which country is home to the kangaroo?", ["South Africa", "Australia", "Brazil", "India"], 1),
        ],
        ["medium"] =
        [
            ("Who wrote 'Romeo and Juliet'?", ["Charles Dickens", "Mark Twain", "William Shakespeare", "Jane Austen"], 2),
            ("What gas do plants mainly absorb from the atmosphere?", ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], 2),
            ("What is the smallest prime number?", ["0", "1", "2", "3"], 2),
            ("How many minutes are in a full day?", ["1200", "1440", "1000", "1800"], 1),
            ("What is the chemical symbol for gold?", ["Go", "Gd", "Au", "Ag"], 2),
            ("Which language has the most native speakers worldwide?", ["English", "Spanish", "Hindi", "Mandarin Chinese"], 3),
            ("How many strings does a standard guitar have?", ["4", "5", "6", "7"], 2),
            ("In which year did the Berlin Wall fall?", ["1987", "1989", "1991", "1993"], 1),
        ],
        ["hard"] =
        [
            ("Who composed 'The Four Seasons'?", ["Johann Sebastian Bach", "Antonio Vivaldi", "Wolfgang Amadeus Mozart", "Ludwig van Beethoven"], 1),
            ("What is the smallest country in the world by area?", ["Monaco", "San Marino", "Vatican City", "Liechtenstein"], 2),
            ("What is the SI unit of electrical resistance?", ["Volt", "Watt", "Ohm", "Ampere"], 2),
            ("Who wrote 'One Hundred Years of Solitude'?", ["Jorge Luis Borges", "Pablo Neruda", "Gabriel García Márquez", "Mario Vargas Llosa"], 2),
            ("What is the capital of Kazakhstan?", ["Almaty", "Astana", "Bishkek", "Tashkent"], 1),
            ("What is the hardest known naturally occurring substance?", ["Quartz", "Titanium", "Diamond", "Graphene"], 2),
            ("Which gas makes up the majority of Earth's atmosphere by volume?", ["Oxygen", "Carbon Dioxide", "Nitrogen", "Argon"], 2),
            ("Who was the first emperor of Rome?", ["Julius Caesar", "Nero", "Augustus", "Caligula"], 2),
        ],
    };

    private static (string Question, string[] Options, int CorrectIndex) RandomFallback(string? difficultyTier = null)
    {
        var pool = difficultyTier is not null && FallbackQuestionsByTier.TryGetValue(difficultyTier, out var tierPool)
            ? tierPool
            : FallbackQuestions;
        var q = pool[Random.Shared.Next(pool.Length)];
        return (q.Question, q.Options, q.CorrectIndex);
    }

    // Picks a topic that isn't in the recent-use buffer (falls back to any topic if the whole
    // pool is somehow excluded) plus an angle, and records the topic as just-used. When
    // `difficultyTier` is given (easy/medium/hard), the angle is drawn from that tier's bucket
    // instead of the full random pool, so question difficulty actually escalates.
    private static (string Topic, string Angle, string RecentTopicsCsv) SelectTopicAndAngle(string? difficultyTier = null)
    {
        lock (StateLock)
        {
            var recentSnapshot = RecentTopics.ToArray();
            var available = TopicPool.Except(recentSnapshot).ToArray();
            var pool = available.Length > 0 ? available : TopicPool;
            var topic = pool[Random.Shared.Next(pool.Length)];
            var angleBucket = difficultyTier is not null && DifficultyAngleModifiers.TryGetValue(difficultyTier, out var bucket)
                ? bucket
                : AngleModifiers;
            var angle = angleBucket[Random.Shared.Next(angleBucket.Length)];

            RecentTopics.Enqueue(topic);
            while (RecentTopics.Count > RecentTopicsBufferSize) RecentTopics.Dequeue();

            return (topic, angle, string.Join(", ", recentSnapshot));
        }
    }

    private static bool TryRecordIfNew(string question)
    {
        lock (StateLock)
        {
            if (!SeenQuestions.Add(question)) return false;
            if (SeenQuestions.Count > SeenQuestionsBufferSize)
            {
                // Cheap unbounded-growth guard -- not strict LRU, just periodic resets.
                SeenQuestions.Clear();
                SeenQuestions.Add(question);
            }
            return true;
        }
    }

    public async Task<(string Question, string[] Options, int CorrectIndex)> GenerateAsync(
        string sourceType, string label, string? difficultyTier = null)
    {
        var config = await db.ApiRequestConfigs.FirstOrDefaultAsync(c => c.Action == "GenerateQuizQuestion" && c.Enabled);
        if (config is null) return RandomFallback(difficultyTier);

        for (var attempt = 1; attempt <= MaxGenerationAttempts; attempt++)
        {
            var (topic, angle, recentTopicsCsv) = SelectTopicAndAngle(difficultyTier);
            var result = await TryGenerateOnceAsync(config, sourceType, $"{label} (attempt {attempt})", topic, angle, recentTopicsCsv, difficultyTier);
            if (result is null) continue; // call/parse failed -- try a different topic

            if (TryRecordIfNew(result.Question))
                return (result.Question, result.Options, result.CorrectIndex);
            // Duplicate of a recently-seen question -- retry with a fresh topic/angle.
        }

        return RandomFallback(difficultyTier);
    }

    private static string DifficultyLevelNumber(string? difficultyTier) => difficultyTier switch
    {
        "easy" => "1",
        "medium" => "2",
        "hard" => "3",
        _ => "2"
    };

    private async Task<QuizGenResult?> TryGenerateOnceAsync(
        ApiRequestConfig config, string sourceType, string label, string topic, string angle, string recentTopicsCsv, string? difficultyTier = null)
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

        // No "seed" -- it forced deterministic, repeated outputs. Topic/angle/recentTopics drive
        // variety instead; the admin's stored prompt body needs {topic}/{angle}/{recentTopics}
        // placeholders to actually use them.
        parameters["topic"] = topic;
        parameters["angle"] = angle;
        parameters["recentTopics"] = recentTopicsCsv;
        // Only meaningful for callers that pass a difficultyTier (Millionaire mode) -- defaults to
        // "medium"/2 for callers that don't (Classic mode, Quiz Duel), so the placeholders always
        // resolve to something rather than being left as a literal {difficulty} in the prompt.
        parameters["difficulty"] = difficultyTier ?? "medium";
        parameters["difficultyLevel"] = DifficultyLevelNumber(difficultyTier);

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
                return null;
            }

            var extracted = WinOfTheWeekService.ExtractTextAtPath(responseBody, textPath ?? "");
            var parsed = string.IsNullOrWhiteSpace(extracted) ? null : JsonSerializer.Deserialize<QuizGenResult>(extracted, mappingOpts);
            if (parsed is null || string.IsNullOrWhiteSpace(parsed.Question) || parsed.Options is null || parsed.Options.Length != 4
                || parsed.CorrectIndex < 0 || parsed.CorrectIndex > 3)
            {
                evt.Status = "failed";
                await db.SaveChangesAsync();
                return null;
            }

            evt.Status = "sent";
            await db.SaveChangesAsync();
            return parsed;
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

    private record QuizGenResult(string Question, string[] Options, int CorrectIndex);
}
