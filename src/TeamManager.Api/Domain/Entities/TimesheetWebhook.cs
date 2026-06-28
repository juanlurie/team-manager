using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Domain.Entities;

public class TimesheetWebhook
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "";
    public string Url { get; set; } = "";
    public string Method { get; set; } = "POST";
    public string HeadersJson { get; set; } = "{}";
    public string BodyTemplate { get; set; } = "";
    public bool OnCreate { get; set; } = true;
    public bool OnUpdate { get; set; } = true;
    public bool OnDelete { get; set; } = true;
    public bool Enabled { get; set; } = true;
    public int MaxRetries { get; set; } = 3;
    public string? StoredCookie { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<TimesheetWebhookDelivery> Deliveries { get; set; } = [];
}
