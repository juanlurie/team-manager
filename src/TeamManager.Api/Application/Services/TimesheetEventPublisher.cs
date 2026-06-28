using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Timesheet;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class TimesheetEventPublisher(AppDbContext db) : ITimesheetEventPublisher
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public async Task PublishAsync(string eventType, TimesheetEntryDto entry)
    {
        var webhooks = await db.TimesheetWebhooks
            .Where(w => w.Enabled &&
                ((eventType == "created" && w.OnCreate) ||
                 (eventType == "updated" && w.OnUpdate) ||
                 (eventType == "deleted" && w.OnDelete)))
            .ToListAsync();

        if (webhooks.Count == 0) return;

        var payload = JsonSerializer.Serialize(new
        {
            @event = $"timesheet_entry_{eventType}",
            data = entry,
            timestamp = DateTimeOffset.UtcNow
        }, JsonOptions);

        foreach (var webhook in webhooks)
        {
            db.TimesheetWebhookDeliveries.Add(new TimesheetWebhookDelivery
            {
                WebhookId = webhook.Id,
                EventType = eventType,
                PayloadJson = payload,
                NextAttemptAt = DateTimeOffset.UtcNow
            });
        }

        await db.SaveChangesAsync();
    }
}
