namespace TeamManager.Api.Domain.Entities;

public class RetroAction
{
    public Guid Id { get; set; }
    public Guid SprintId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string? AssignedTo { get; set; }
    public string Status { get; set; } = "Open";
    public DateOnly? DueDate { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
