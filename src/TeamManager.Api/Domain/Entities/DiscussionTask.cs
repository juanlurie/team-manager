namespace TeamManager.Api.Domain.Entities;

public class DiscussionTask
{
    public Guid Id { get; set; }
    public Guid DiscussionPointId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? TeamMemberId { get; set; }
    public bool IsCompleted { get; set; } = false;
    public DateOnly? DueDate { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CompletedAt { get; set; }

    public DiscussionPoint DiscussionPoint { get; set; } = null!;
    public TeamMember? Assignee { get; set; }
}
