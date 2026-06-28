namespace TeamManager.Api.Application.DTOs.Achievement;

public record MemberAchievementDto
{
    public Guid Id { get; init; }
    public Guid TeamMemberId { get; init; }
    public string MemberName { get; init; } = string.Empty;
    public Guid AchievementId { get; init; }
    public string AchievementKey { get; init; } = string.Empty;
    public string AchievementName { get; init; } = string.Empty;
    public string AchievementIcon { get; init; } = string.Empty;
    public string AchievementCategory { get; init; } = string.Empty;
    public string? Note { get; init; }
    public DateTimeOffset AwardedAt { get; init; }
}
