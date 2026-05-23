using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.BackgroundServices;

public class RunDeadlineWorker(IServiceProvider serviceProvider, ILogger<RunDeadlineWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("RunDeadlineWorker started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CloseExpiredRunsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing run deadlines");
            }

            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }

        logger.LogInformation("RunDeadlineWorker stopped");
    }

    private async Task CloseExpiredRunsAsync(CancellationToken cancellationToken)
    {
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var now = DateTimeOffset.UtcNow;

        var expiredRuns = await db.CoffeeRuns
            .Where(r => r.Status == CoffeeRunStatus.Open
                     && r.OrderDeadline.HasValue
                     && r.OrderDeadline.Value <= now)
            .ToListAsync(cancellationToken);

        foreach (var run in expiredRuns)
        {
            run.Status = CoffeeRunStatus.Closed;
            run.ClosedAt = now;
            logger.LogInformation("Auto-closed run {RunId} (deadline expired)", run.Id);
        }

        if (expiredRuns.Count > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Closed {Count} expired runs", expiredRuns.Count);
        }
    }
}
