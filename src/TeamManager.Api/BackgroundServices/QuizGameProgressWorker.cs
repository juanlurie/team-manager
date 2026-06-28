using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.BackgroundServices;

// Quiz Game's reveal/advance/completion is driven by lazy resolution on every client fetch --
// this worker makes sure that still happens even if everyone closes their tab mid-question,
// so a session never gets stuck waiting for a poll that's never coming.
public class QuizGameProgressWorker(IServiceProvider serviceProvider, ILogger<QuizGameProgressWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("QuizGameProgressWorker started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProgressActiveSessionsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error progressing quiz game sessions");
            }

            await Task.Delay(TimeSpan.FromSeconds(3), stoppingToken);
        }

        logger.LogInformation("QuizGameProgressWorker stopped");
    }

    private async Task ProgressActiveSessionsAsync(CancellationToken cancellationToken)
    {
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var quizGame = scope.ServiceProvider.GetRequiredService<QuizGameService>();

        var activeIds = await db.QuizGameSessions
            .Where(s => s.Status == QuizGameSessionStatus.InProgress)
            .Select(s => s.Id)
            .ToListAsync(cancellationToken);

        foreach (var id in activeIds)
            await quizGame.ProgressSessionAsync(id);
    }
}
