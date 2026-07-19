using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

/// <summary>
/// The Win of the Week reward economy: the per-week token wallet (grant / spend / balance) and the
/// winner's achievement + points award. Peeled off WinOfTheWeekService — a cohesive concern that
/// only touches WowMemberTokens (and, for the award, the org-wide achievement/points tables), so it
/// stands alone and is independently testable.
/// </summary>
public class WowTokenService(AppDbContext db)
{
    /// <summary>Grants everyone active their one weekly token when a week opens.</summary>
    public async Task GrantWeeklyTokensAsync(Guid winWeekId)
    {
        var activeMembers = await db.TeamMembers
            .Where(m => m.IsActive)
            .Select(m => m.Id)
            .ToListAsync();

        var tokens = activeMembers.Select(memberId => new WowMemberToken
        {
            TeamMemberId = memberId,
            WinWeekId = winWeekId,
            Source = "Weekly"
        });

        db.WowMemberTokens.AddRange(tokens);
        await db.SaveChangesAsync();
    }

    /// <summary>An extra token for whoever nominated the winner.</summary>
    public async Task GrantBonusTokenAsync(Guid memberId, Guid winWeekId)
    {
        db.WowMemberTokens.Add(new WowMemberToken
        {
            TeamMemberId = memberId,
            WinWeekId = winWeekId,
            Source = "WinnerBonus"
        });
        await db.SaveChangesAsync();
    }

    /// <summary>Idempotently ensures the member has their weekly token (covers members who joined
    /// after the week opened, or a week opened before they existed).</summary>
    public async Task EnsureWeeklyTokenAsync(Guid memberId, Guid winWeekId)
    {
        var alreadyGranted = await db.WowMemberTokens
            .AnyAsync(t => t.TeamMemberId == memberId && t.WinWeekId == winWeekId && t.Source == "Weekly");

        if (!alreadyGranted)
        {
            db.WowMemberTokens.Add(new WowMemberToken
            {
                TeamMemberId = memberId,
                WinWeekId = winWeekId,
                Source = "Weekly"
            });
            await db.SaveChangesAsync();
        }
    }

    /// <summary>Spends one unspent token on a nomination; throws if the member has none.</summary>
    public async Task SpendTokenAsync(Guid memberId, Guid winWeekId, Guid nominationId)
    {
        await EnsureWeeklyTokenAsync(memberId, winWeekId);

        var token = await db.WowMemberTokens
            .FirstOrDefaultAsync(t => t.TeamMemberId == memberId && t.WinWeekId == winWeekId && t.SpentAt == null);

        if (token is null)
            throw new InvalidOperationException("You don't have any tokens available this week.");

        token.SpentAt = DateTimeOffset.UtcNow;
        token.SpentOnNominationId = nominationId;
        await db.SaveChangesAsync();
    }

    /// <summary>Unspent-token balance for a member this week (ensures the weekly token first).</summary>
    public async Task<int> GetBalanceAsync(Guid memberId, Guid winWeekId)
    {
        await EnsureWeeklyTokenAsync(memberId, winWeekId);

        return await db.WowMemberTokens
            .CountAsync(t => t.TeamMemberId == memberId && t.WinWeekId == winWeekId && t.SpentAt == null);
    }

    /// <summary>Awards the "win-of-the-week" achievement + its points to a winning nominee, once per
    /// person per month (no-op if the achievement isn't seeded, or already awarded that month).</summary>
    public async Task AwardWeeklyAchievementAsync(Guid winnerMemberId, DateOnly weekStart)
    {
        var achievement = await db.Achievements
            .FirstOrDefaultAsync(a => a.Key == "win-of-the-week");

        if (achievement is null) return;

        var monthLabel = weekStart.ToString("MMMM yyyy");
        var alreadyAwarded = await db.MemberAchievements
            .AnyAsync(ma => ma.TeamMemberId == winnerMemberId
                         && ma.AchievementId == achievement.Id
                         && ma.Note == monthLabel);

        if (alreadyAwarded) return;

        db.MemberAchievements.Add(new MemberAchievement
        {
            TeamMemberId = winnerMemberId,
            AchievementId = achievement.Id,
            AwardedAt = DateTimeOffset.UtcNow,
            Note = monthLabel
        });

        db.PointAwards.Add(new PointAward
        {
            TeamMemberId = winnerMemberId,
            Points = achievement.Points,
            Reason = $"Win of the Week Champion — {monthLabel}",
            AwardedAt = DateTimeOffset.UtcNow
        });

        await db.SaveChangesAsync();
    }
}
