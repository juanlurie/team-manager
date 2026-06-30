namespace TeamManager.Api.Domain.Entities;

public class MemberTask
{
    public Guid Id { get; set; }
    public Guid TeamMemberId { get; set; }
    public string Title { get; set; } = "";
    public bool IsCompleted { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateOnly? DueDate { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }

    public TeamMember TeamMember { get; set; } = null!;
}
