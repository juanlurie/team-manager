using TeamManager.Api.Application.Services;

namespace TeamManager.Api.BackgroundServices;

// A poll's scheduled close also happens lazily on every fetch (see PollService.AutoCloseDuePollsAsync),
// but if nobody happens to load it around the scheduled time, this worker still closes it on
// schedule instead of leaving it open until someone next looks.
public class PollProgressWorker(IServiceProvider serviceProvider, ILogger<PollProgressWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("PollProgressWorker started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = serviceProvider.CreateScope();
                var polls = scope.ServiceProvider.GetRequiredService<PollService>();
                await polls.AutoCloseDuePollsAsync();
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error auto-closing scheduled polls");
            }

            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        }

        logger.LogInformation("PollProgressWorker stopped");
    }
}
