namespace TeamManager.Api.Domain.Entities;

public class TimesheetEntry
{
    public Guid Id { get; set; }
    public Guid TeamMemberId { get; set; }
    public DateOnly Date { get; set; }
    public string Project { get; set; } = "";
    public string Category { get; set; } = "";
    public int Hours { get; set; }
    public int Minutes { get; set; }
    public bool Billable { get; set; }
    public string WorkedFrom { get; set; } = "";
    public string Sentiment { get; set; } = "";
    public string? Description { get; set; }
    public string? TicketNumber { get; set; }
    public string? ExternalId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public TeamMember TeamMember { get; set; } = null!;
}
