using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Leaderboard;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class LeaderboardService(AppDbContext db) : ILeaderboardService
{
    private const int PointsPerSprint = 5;

    public async Task<IReadOnlyList<LeaderboardEntryDto>> GetLeaderboardAsync()
    {
        var members = await db.TeamMembers
            .Where(m => m.IsActive)
            .Include(m => m.Achievements).ThenInclude(a => a.Achievement)
            .Include(m => m.SprintMemberships)
            .Include(m => m.PointAwards)
            .ToListAsync();

        return members
            .Select(BuildEntry)
            .OrderByDescending(e => e.TotalPoints)
            .ThenBy(e => e.LastName)
            .Select((e, i) => e with { Position = i + 1 })
            .ToList();
    }

    public async Task<LeaderboardEntryDto?> GetMemberStatsAsync(Guid memberId)
    {
        var member = await db.TeamMembers
            .Where(m => m.Id == memberId)
            .Include(m => m.Achievements).ThenInclude(a => a.Achievement)
            .Include(m => m.SprintMemberships)
            .Include(m => m.PointAwards)
            .FirstOrDefaultAsync();

        return member is null ? null : BuildEntry(member) with { Position = 0 };
    }

    public async Task AwardPointsAsync(AwardPointsRequest request)
    {
        db.PointAwards.Add(new PointAward
        {
            TeamMemberId = request.TeamMemberId,
            Points = request.Points,
            Reason = request.Reason,
            AwardedAt = DateTimeOffset.UtcNow
        });
        await db.SaveChangesAsync();
    }

    public async Task<bool> RevokePointAwardAsync(Guid pointAwardId)
    {
        var award = await db.PointAwards.FindAsync(pointAwardId);
        if (award is null) return false;
        db.PointAwards.Remove(award);
        await db.SaveChangesAsync();
        return true;
    }

    private static LeaderboardEntryDto BuildEntry(TeamMember m)
    {
        var breakdown = new List<PointBreakdownItem>();

        // Badge points — group by category for the breakdown
        var badgesByCategory = m.Achievements
            .GroupBy(a => a.Achievement.Category)
            .OrderBy(g => g.Key);

        int badgePoints = 0;
        foreach (var group in badgesByCategory)
        {
            var pts = group.Sum(a => a.Achievement.Points);
            badgePoints += pts;
            breakdown.Add(new PointBreakdownItem("badge", group.Key, pts, group.Count()));
        }

        // Sprint participation points
        var sprintCount = m.SprintMemberships.Count;
        var sprintPoints = sprintCount * PointsPerSprint;
        if (sprintCount > 0)
            breakdown.Add(new PointBreakdownItem("sprint", "Sprints", sprintPoints, sprintCount));

        // Bonus / custom point awards
        var bonusPoints = m.PointAwards.Sum(p => p.Points);
        if (bonusPoints != 0)
            breakdown.Add(new PointBreakdownItem("bonus", "Bonus", bonusPoints, m.PointAwards.Count));

        return new LeaderboardEntryDto
        {
            MemberId = m.Id,
            FirstName = m.FirstName,
            LastName = m.LastName,
            Role = m.Role.ToString(),
            TotalPoints = badgePoints + sprintPoints + bonusPoints,
            BadgePoints = badgePoints,
            SprintPoints = sprintPoints,
            BonusPoints = bonusPoints,
            Breakdown = breakdown
        };
    }
}
