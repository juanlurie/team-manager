namespace TeamManager.Api.Application.DTOs.Leaderboard;

public record AwardPointsRequest(Guid TeamMemberId, int Points, string Reason);
