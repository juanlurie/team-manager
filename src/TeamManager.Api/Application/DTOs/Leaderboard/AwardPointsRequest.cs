using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.Leaderboard;

public record AwardPointsRequest(
    [Required] Guid TeamMemberId,
    [Required][Range(1, 10000)] int Points,
    [Required][MaxLength(500)] string Reason
);
