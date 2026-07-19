using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.BackgroundServices;

// Owns time-based tie-breaker progression for Win of the Week: closing expired sudden-death rounds,
// resolving expired hype battles, and advancing the Quiz Duel reveal/auto-loop. These used to run
// inline in the (heavily polled) GET, where concurrent callers raced into a double close/award.
// Running them here on a single serial loop makes that resolution race-free by construction.
public class WowTiebreakerProgressWorker(IServiceProvider serviceProvider, ILogger<WowTiebreakerProgressWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("WowTiebreakerProgressWorker started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProgressAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error progressing Win of the Week tie-breakers");
            }

            await Task.Delay(TimeSpan.FromSeconds(3), stoppingToken);
        }

        logger.LogInformation("WowTiebreakerProgressWorker stopped");
    }

    private async Task ProgressAsync(CancellationToken cancellationToken)
    {
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var wowService = scope.ServiceProvider.GetRequiredService<IWinOfTheWeekService>();
        var now = DateTimeOffset.UtcNow;

        // Any non-closed week with a live tie-breaker: an active quiz, an expired sudden-death timer,
        // or an expired hype-battle timer. One query, then resolve each serially.
        var weeks = await db.WinWeeks
            .Where(w => w.Status != WinWeekStatus.Closed && (
                w.QuizQuestion != null ||
                (w.Status == WinWeekStatus.SuddenDeath && w.SuddenDeathEndsAt != null && w.SuddenDeathEndsAt < now) ||
                (w.HypeBattleEndsAt != null && w.HypeBattleEndsAt < now)))
            .ToListAsync(cancellationToken);

        foreach (var week in weeks)
        {
            if (week.Status == WinWeekStatus.SuddenDeath && week.SuddenDeathEndsAt.HasValue && week.SuddenDeathEndsAt.Value < now)
                await wowService.AutoCloseExpiredSuddenDeathAsync(week.Id);

            // Re-check status: the sudden-death close above may have closed this week already.
            if (week.HypeBattleEndsAt.HasValue && week.HypeBattleEndsAt.Value < now)
                await wowService.AutoResolveExpiredHypeBattleAsync(week.Id);

            if (week.QuizQuestion != null)
                await wowService.ClearExpiredQuizAsync(week);
        }
    }
}
