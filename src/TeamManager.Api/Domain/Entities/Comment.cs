namespace TeamManager.Api.Domain.Entities;

public class Comment
{
    public Guid Id { get; set; }
    public string EntityType { get; set; } = string.Empty; // "Feature" | "WorkItem" | "DiscussionPoint"
    public Guid EntityId { get; set; }
    public string Text { get; set; } = string.Empty;
    public string? AuthorName { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
