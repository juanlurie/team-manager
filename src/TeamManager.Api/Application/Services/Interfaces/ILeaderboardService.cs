using TeamManager.Api.Application.DTOs.Leaderboard;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface ILeaderboardService
{
    Task<IReadOnlyList<LeaderboardEntryDto>> GetLeaderboardAsync();
    Task<LeaderboardEntryDto?> GetMemberStatsAsync(Guid memberId);
    Task AwardPointsAsync(AwardPointsRequest request);
    Task<bool> RevokePointAwardAsync(Guid pointAwardId);
    Task<IReadOnlyList<PointHistoryEntryDto>> GetPointHistoryAsync(Guid memberId);
}
