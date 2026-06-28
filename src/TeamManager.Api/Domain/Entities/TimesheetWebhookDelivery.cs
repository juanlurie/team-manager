using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Domain.Entities;

public class TimesheetWebhookDelivery
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WebhookId { get; set; }
    public TimesheetWebhook Webhook { get; set; } = null!;
    public string EventType { get; set; } = "";
    public string PayloadJson { get; set; } = "";
    public string Status { get; set; } = "pending";
    public int AttemptCount { get; set; }
    public DateTimeOffset? NextAttemptAt { get; set; } = DateTimeOffset.UtcNow;
    public int? LastStatusCode { get; set; }
    public string? LastError { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? DeliveredAt { get; set; }
}
