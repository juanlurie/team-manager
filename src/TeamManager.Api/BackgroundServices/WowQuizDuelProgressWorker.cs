using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.BackgroundServices;

// Mirrors QuizGameProgressWorker: the Quiz Duel tiebreaker's reveal/auto-loop also only progresses
// on a client fetch, so this makes sure a duel doesn't get stuck waiting on a poll that's never coming.
public class WowQuizDuelProgressWorker(IServiceProvider serviceProvider, ILogger<WowQuizDuelProgressWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("WowQuizDuelProgressWorker started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProgressActiveQuizzesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error progressing Win of the Week quiz duels");
            }

            await Task.Delay(TimeSpan.FromSeconds(3), stoppingToken);
        }

        logger.LogInformation("WowQuizDuelProgressWorker stopped");
    }

    private async Task ProgressActiveQuizzesAsync(CancellationToken cancellationToken)
    {
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var wowService = scope.ServiceProvider.GetRequiredService<IWinOfTheWeekService>();

        var activeWeeks = await db.WinWeeks
            .Where(w => w.QuizQuestion != null)
            .ToListAsync(cancellationToken);

        foreach (var week in activeWeeks)
            await wowService.ClearExpiredQuizAsync(week);
    }
}
