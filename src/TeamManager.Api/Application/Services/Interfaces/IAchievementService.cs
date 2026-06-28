using TeamManager.Api.Application.DTOs.Achievement;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface IAchievementService
{
    Task<IReadOnlyList<AchievementDto>> GetAllAsync();
    Task<IReadOnlyList<MemberAchievementDto>> GetForMemberAsync(Guid memberId);
    Task<MemberAchievementDto> AwardAsync(AwardAchievementRequest request);
    Task<bool> RevokeAsync(Guid memberAchievementId);
}
