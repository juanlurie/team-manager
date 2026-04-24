namespace TeamManager.Api.Domain.Entities;

public class MemberNote
{
    public Guid Id { get; set; }
    public Guid TeamMemberId { get; set; }
    public string Text { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public TeamMember TeamMember { get; set; } = null!;
}
