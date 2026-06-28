using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Achievement;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class AchievementService(AppDbContext db) : IAchievementService
{
    public async Task<IReadOnlyList<AchievementDto>> GetAllAsync()
    {
        var list = await db.Achievements
            .OrderBy(a => a.Category).ThenBy(a => a.Name)
            .ToListAsync();
        return list.Select(ToDto).ToList();
    }

    public async Task<IReadOnlyList<MemberAchievementDto>> GetForMemberAsync(Guid memberId)
    {
        var list = await db.MemberAchievements
            .Include(ma => ma.Achievement)
            .Include(ma => ma.TeamMember)
            .Where(ma => ma.TeamMemberId == memberId)
            .OrderByDescending(ma => ma.AwardedAt)
            .ToListAsync();
        return list.Select(ToAwardDto).ToList();
    }

    public async Task<MemberAchievementDto> AwardAsync(AwardAchievementRequest request)
    {
        var award = new MemberAchievement
        {
            TeamMemberId = request.TeamMemberId,
            AchievementId = request.AchievementId,
            Note = request.Note,
            AwardedAt = DateTimeOffset.UtcNow
        };
        db.MemberAchievements.Add(award);
        await db.SaveChangesAsync();
        await db.Entry(award).Reference(a => a.Achievement).LoadAsync();
        await db.Entry(award).Reference(a => a.TeamMember).LoadAsync();
        return ToAwardDto(award);
    }

    public async Task<bool> RevokeAsync(Guid memberAchievementId)
    {
        var award = await db.MemberAchievements.FindAsync(memberAchievementId);
        if (award is null) return false;
        db.MemberAchievements.Remove(award);
        await db.SaveChangesAsync();
        return true;
    }

    private static AchievementDto ToDto(Achievement a) => new()
    {
        Id = a.Id,
        Key = a.Key,
        Name = a.Name,
        Description = a.Description,
        Icon = a.Icon,
        Category = a.Category,
        Points = a.Points
    };

    private static MemberAchievementDto ToAwardDto(MemberAchievement ma) => new()
    {
        Id = ma.Id,
        TeamMemberId = ma.TeamMemberId,
        MemberName = $"{ma.TeamMember.FirstName} {ma.TeamMember.LastName}",
        AchievementId = ma.AchievementId,
        AchievementKey = ma.Achievement.Key,
        AchievementName = ma.Achievement.Name,
        AchievementIcon = ma.Achievement.Icon,
        AchievementCategory = ma.Achievement.Category,
        Note = ma.Note,
        AwardedAt = ma.AwardedAt
    };
}
