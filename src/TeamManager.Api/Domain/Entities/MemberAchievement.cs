namespace TeamManager.Api.Domain.Entities;

public class MemberAchievement
{
    public Guid Id { get; set; }
    public Guid TeamMemberId { get; set; }
    public Guid AchievementId { get; set; }
    public DateTimeOffset AwardedAt { get; set; } = DateTimeOffset.UtcNow;
    public string? Note { get; set; }

    public TeamMember TeamMember { get; set; } = null!;
    public Achievement Achievement { get; set; } = null!;
}
