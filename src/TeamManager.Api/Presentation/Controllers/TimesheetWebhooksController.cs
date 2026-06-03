using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("settings")]
[Route("api/v1/timesheet-webhooks")]
[Authorize]
public class TimesheetWebhooksController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var webhooks = await db.TimesheetWebhooks
            .OrderBy(w => w.Name)
            .ToListAsync();

        return Ok(webhooks.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var webhook = await db.TimesheetWebhooks.FindAsync(id);
        if (webhook == null) return NotFound();
        return Ok(ToDto(webhook));
    }

    [HttpPost]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Create([FromBody] TimesheetWebhookRequest req)
    {
        var webhook = new TimesheetWebhook
        {
            Name = req.Name,
            Url = req.Url,
            Method = req.Method,
            HeadersJson = JsonSerializer.Serialize(req.Headers ?? new()),
            BodyTemplate = req.BodyTemplate ?? "",
            OnCreate = req.OnCreate,
            OnUpdate = req.OnUpdate,
            OnDelete = req.OnDelete,
            Enabled = req.Enabled,
            MaxRetries = Math.Clamp(req.MaxRetries, 1, 10),
            StoredCookie = req.StoredCookie
        };

        db.TimesheetWebhooks.Add(webhook);
        await db.SaveChangesAsync();
        return Ok(ToDto(webhook));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Update(Guid id, [FromBody] TimesheetWebhookRequest req)
    {
        var webhook = await db.TimesheetWebhooks.FindAsync(id);
        if (webhook == null) return NotFound();

        webhook.Name = req.Name;
        webhook.Url = req.Url;
        webhook.Method = req.Method;
        webhook.HeadersJson = JsonSerializer.Serialize(req.Headers ?? new());
        webhook.BodyTemplate = req.BodyTemplate ?? "";
        webhook.OnCreate = req.OnCreate;
        webhook.OnUpdate = req.OnUpdate;
        webhook.OnDelete = req.OnDelete;
        webhook.Enabled = req.Enabled;
        webhook.MaxRetries = Math.Clamp(req.MaxRetries, 1, 10);
        webhook.StoredCookie = req.StoredCookie;

        await db.SaveChangesAsync();
        return Ok(ToDto(webhook));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var webhook = await db.TimesheetWebhooks.FindAsync(id);
        if (webhook == null) return NotFound();

        db.TimesheetWebhooks.Remove(webhook);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id:guid}/deliveries")]
    public async Task<IActionResult> GetDeliveries(Guid id, [FromQuery] int limit = 50)
    {
        var deliveries = await db.TimesheetWebhookDeliveries
            .Where(d => d.WebhookId == id)
            .OrderByDescending(d => d.CreatedAt)
            .Take(Math.Min(limit, 200))
            .ToListAsync();

        return Ok(deliveries.Select(ToDeliveryDto));
    }

    [HttpPost("{id:guid}/deliveries/{deliveryId:guid}/retry")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> RetryDelivery(Guid id, Guid deliveryId)
    {
        var delivery = await db.TimesheetWebhookDeliveries
            .FirstOrDefaultAsync(d => d.Id == deliveryId && d.WebhookId == id);

        if (delivery == null) return NotFound();

        delivery.Status = "pending";
        delivery.NextAttemptAt = DateTimeOffset.UtcNow;
        delivery.AttemptCount = 0;
        delivery.LastError = null;
        delivery.LastStatusCode = null;

        await db.SaveChangesAsync();
        return Ok(ToDeliveryDto(delivery));
    }

    private static TimesheetWebhookDto ToDto(TimesheetWebhook w) => new(
        w.Id, w.Name, w.Url, w.Method,
        JsonSerializer.Deserialize<Dictionary<string, string>>(w.HeadersJson) ?? new(),
        w.BodyTemplate, w.OnCreate, w.OnUpdate, w.OnDelete,
        w.Enabled, w.MaxRetries, w.StoredCookie, w.CreatedAt
    );

    private static TimesheetWebhookDeliveryDto ToDeliveryDto(TimesheetWebhookDelivery d) => new(
        d.Id, d.WebhookId, d.EventType, d.Status, d.AttemptCount,
        d.NextAttemptAt, d.LastStatusCode, d.LastError, d.CreatedAt, d.DeliveredAt
    );
}

public record TimesheetWebhookRequest(
    string Name,
    string Url,
    string Method = "POST",
    Dictionary<string, string>? Headers = null,
    string? BodyTemplate = null,
    bool OnCreate = true,
    bool OnUpdate = true,
    bool OnDelete = true,
    bool Enabled = true,
    int MaxRetries = 3,
    string? StoredCookie = null
);

public record TimesheetWebhookDto(
    Guid Id,
    string Name,
    string Url,
    string Method,
    Dictionary<string, string> Headers,
    string BodyTemplate,
    bool OnCreate,
    bool OnUpdate,
    bool OnDelete,
    bool Enabled,
    int MaxRetries,
    string? StoredCookie,
    DateTimeOffset CreatedAt
);

public record TimesheetWebhookDeliveryDto(
    Guid Id,
    Guid WebhookId,
    string EventType,
    string Status,
    int AttemptCount,
    DateTimeOffset? NextAttemptAt,
    int? LastStatusCode,
    string? LastError,
    DateTimeOffset CreatedAt,
    DateTimeOffset? DeliveredAt
);
