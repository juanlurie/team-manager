using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.Realtime;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

/// <summary>
/// Default <see cref="IWinStoryGenerator"/>: runs generation on a background task with its own DI
/// scope, so it outlives the request that closed the week. Best-effort — any failure is swallowed,
/// a missing win story is not worth failing a close over. The notifier is a singleton and safe to
/// capture; the DbContext, AI executor and webhook dispatcher are scoped and resolved per run.
/// </summary>
public class WinStoryGenerator(IServiceScopeFactory scopeFactory, IWowNotifier notifier) : IWinStoryGenerator
{
    public void Enqueue(Guid weekId, string winnerName, string title, string? description)
    {
        _ = Task.Run(async () =>
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var bgDb = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var bgExecutor = scope.ServiceProvider.GetRequiredService<AiPromptExecutorService>();
            try
            {
                var promptParams = new Dictionary<string, string>
                {
                    ["nominee"] = winnerName,
                    ["title"] = title,
                    ["description"] = description ?? ""
                };

                var story = await bgExecutor.ExecuteAsync("AiChatWinStory", promptParams, "WinWeek", $"Win Story — {winnerName}", weekId.ToString());
                if (!string.IsNullOrWhiteSpace(story))
                {
                    var winWeek = await bgDb.WinWeeks.FindAsync(weekId);
                    if (winWeek is not null)
                    {
                        winWeek.WinnerStory = story.Trim();
                        await bgDb.SaveChangesAsync();
                        notifier.Broadcast("win_story_ready", new { weekId }, guestAllowed: true);
                    }
                    // Resolve the dispatcher from the background scope so it shares bgDb.
                    var dispatcher = scope.ServiceProvider.GetRequiredService<WinStoryWebhookDispatcher>();
                    await dispatcher.DispatchAsync(story.Trim(), winnerName, weekId);
                }
            }
            catch { /* best-effort */ }
        });
    }
}
