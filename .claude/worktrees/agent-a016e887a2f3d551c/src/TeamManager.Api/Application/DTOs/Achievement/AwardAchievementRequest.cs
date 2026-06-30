using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.Achievement;

public record AwardAchievementRequest(
    [Required] Guid TeamMemberId,
    [Required] Guid AchievementId,
    [MaxLength(500)] string? Note = null
);
