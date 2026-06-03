namespace TeamManager.Api.Domain.Entities;

public class ApiSyncEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Action { get; set; } = "";
    public string ConfigName { get; set; } = "";
    public string Label { get; set; } = ""; // human-readable summary e.g. "2026-06-01 | Development | 1h"
    public string? SourceId { get; set; }   // e.g. TimesheetEntry.Id
    public string SourceType { get; set; } = ""; // e.g. "TimesheetEntry"
    public string ResolvedUrl { get; set; } = "";
    public string ResolvedHeadersJson { get; set; } = "{}";
    public string ResolvedBody { get; set; } = "";
    public string BodyFormat { get; set; } = "urlencoded";
    public string Status { get; set; } = "pending"; // pending | sent | failed | dismissed
    public string? ExternalId { get; set; }
    public string? ResponseBody { get; set; }
    public int? ResponseStatus { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? SentAt { get; set; }
}
