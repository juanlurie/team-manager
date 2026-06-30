using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.BackgroundServices;

public class TimesheetWebhookWorker(IServiceProvider serviceProvider, ILogger<TimesheetWebhookWorker> logger) : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("TimesheetWebhookWorker started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingDeliveriesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing timesheet webhook deliveries");
            }

            await Task.Delay(PollInterval, stoppingToken);
        }

        logger.LogInformation("TimesheetWebhookWorker stopped");
    }

    private async Task ProcessPendingDeliveriesAsync(CancellationToken cancellationToken)
    {
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var httpClientFactory = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>();

        var now = DateTimeOffset.UtcNow;

        var pending = await db.TimesheetWebhookDeliveries
            .Include(d => d.Webhook)
            .Where(d => d.Status == "pending" && d.NextAttemptAt <= now)
            .OrderBy(d => d.NextAttemptAt)
            .Take(20)
            .ToListAsync(cancellationToken);

        foreach (var delivery in pending)
        {
            delivery.AttemptCount++;
            var (success, statusCode, error) = await SendAsync(httpClientFactory, delivery);

            delivery.LastStatusCode = statusCode;
            delivery.LastError = error;

            if (success)
            {
                delivery.Status = "success";
                delivery.DeliveredAt = DateTimeOffset.UtcNow;
                logger.LogInformation("Webhook {WebhookId} delivered for event {EventType} (attempt {Attempt})",
                    delivery.WebhookId, delivery.EventType, delivery.AttemptCount);
            }
            else if (delivery.AttemptCount >= delivery.Webhook.MaxRetries)
            {
                delivery.Status = "exhausted";
                delivery.NextAttemptAt = null;
                logger.LogWarning("Webhook {WebhookId} exhausted after {Attempts} attempts for event {EventType}: {Error}",
                    delivery.WebhookId, delivery.AttemptCount, delivery.EventType, error);
            }
            else
            {
                // Exponential backoff: 30s, 5m, 30m, 2h, ...
                var delay = TimeSpan.FromSeconds(30 * Math.Pow(10, delivery.AttemptCount - 1));
                delivery.NextAttemptAt = DateTimeOffset.UtcNow + delay;
                logger.LogWarning("Webhook {WebhookId} failed (attempt {Attempt}), retrying at {NextAttempt}: {Error}",
                    delivery.WebhookId, delivery.AttemptCount, delivery.NextAttemptAt, error);
            }
        }

        if (pending.Count > 0)
            await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task<(bool Success, int? StatusCode, string? Error)> SendAsync(
        IHttpClientFactory factory, Domain.Entities.TimesheetWebhookDelivery delivery)
    {
        try
        {
            var webhook = delivery.Webhook;
            var client = factory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(30);

            var cookie = webhook.StoredCookie ?? "";
            var headers = JsonSerializer.Deserialize<Dictionary<string, string>>(webhook.HeadersJson) ?? [];
            foreach (var (key, value) in headers)
                client.DefaultRequestHeaders.TryAddWithoutValidation(key, value.Replace("{cookie}", cookie));

            var body = string.IsNullOrWhiteSpace(webhook.BodyTemplate)
                ? delivery.PayloadJson
                : webhook.BodyTemplate
                    .Replace("{payload}", delivery.PayloadJson)
                    .Replace("{event}", delivery.EventType)
                    .Replace("{cookie}", cookie);

            var content = new StringContent(body, Encoding.UTF8, "application/json");

            var response = webhook.Method.Equals("GET", StringComparison.OrdinalIgnoreCase)
                ? await client.GetAsync(webhook.Url)
                : await client.PostAsync(webhook.Url, content);

            var statusCode = (int)response.StatusCode;

            if (response.IsSuccessStatusCode)
                return (true, statusCode, null);

            var responseBody = await response.Content.ReadAsStringAsync();
            return (false, statusCode, $"HTTP {statusCode}: {responseBody[..Math.Min(500, responseBody.Length)]}");
        }
        catch (Exception ex)
        {
            return (false, null, ex.Message);
        }
    }
}
