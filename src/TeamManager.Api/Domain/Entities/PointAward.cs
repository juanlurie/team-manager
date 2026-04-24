namespace TeamManager.Api.Domain.Entities;

public class PointAward
{
    public Guid Id { get; set; }
    public Guid TeamMemberId { get; set; }
    public int Points { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTimeOffset AwardedAt { get; set; } = DateTimeOffset.UtcNow;

    public TeamMember TeamMember { get; set; } = null!;
}
