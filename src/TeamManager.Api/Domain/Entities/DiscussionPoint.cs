namespace TeamManager.Api.Domain.Entities;

public class DiscussionPoint
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string Status { get; set; } = "Open";
    public string Priority { get; set; } = "Medium";
    public Guid? SprintId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
