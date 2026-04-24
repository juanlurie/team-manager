namespace TeamManager.Api.Application.DTOs.Achievement;

public record AwardAchievementRequest(Guid TeamMemberId, Guid AchievementId, string? Note = null);
