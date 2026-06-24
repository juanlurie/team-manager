using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/jokes")]
[Authorize]
[RequireFeature("jokes")]
public class JokesController(AppDbContext db, Application.Services.AiPromptExecutorService executor) : ControllerBase
{
    private const int MaxRecentJokes = 50;

    [HttpGet("configured")]
    public async Task<IActionResult> IsConfigured()
    {
        var enabled = await db.AiPrompts.AnyAsync(p => p.Key == "GenerateJoke" && p.Enabled);
        return Ok(new { configured = enabled });
    }

    [HttpPost("generate")]
    public async Task<IActionResult> GenerateJoke([FromBody] GenerateJokeRequest request)
    {
        var hasPrompt = await db.AiPrompts.AnyAsync(p => p.Key == "GenerateJoke" && p.Enabled);
        if (!hasPrompt)
            return Ok(new { configured = false });

        var recentJokes = await db.JokeHistory
            .Where(h => h.JokeTypeId == request.JokeTypeId)
            .OrderByDescending(h => h.CreatedAt)
            .Take(MaxRecentJokes)
            .Select(h => h.JokeText)
            .ToListAsync();

        var jokePrompt = recentJokes.Count > 0
            ? $"{request.JokeType}\n\nDo NOT repeat any of these jokes you've already told:\n{string.Join("\n", recentJokes.Select(j => $"- {j}"))}"
            : request.JokeType;

        // No manual JSON-escaping needed here -- AiPromptExecutorService JSON-encodes the fully
        // resolved prompt text itself, so newlines/quotes in jokePrompt are handled automatically.
        var promptParams = new Dictionary<string, string>
        {
            ["jokeType"] = jokePrompt,
            ["seed"] = Guid.NewGuid().ToString("N")[..8]
        };

        var joke = await executor.ExecuteAsync("GenerateJoke", promptParams, "Joke", $"Joke — {request.JokeLabel}");
        if (!string.IsNullOrWhiteSpace(joke))
        {
            db.JokeHistory.Add(new Domain.Entities.JokeHistory
            {
                JokeTypeId = request.JokeTypeId,
                JokeText = joke
            });
            await db.SaveChangesAsync();
        }

        var status = joke is not null ? "sent" : "failed";

        await WebSocketMiddleware.BroadcastAsync("joke_generated", new
        {
            jokeTypeId = request.JokeTypeId,
            joke,
            status
        });

        return Ok(new { configured = true, joke, status });
    }
}

public record GenerateJokeRequest(string JokeType, string JokeLabel, string JokeTypeId);
