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

    public async Task<IReadOnlyList<PointHistoryEntryDto>> GetPointHistoryAsync(Guid memberId)
    {
        var member = await db.TeamMembers
            .Where(m => m.Id == memberId)
            .Include(m => m.Achievements).ThenInclude(a => a.Achievement)
            .Include(m => m.SprintMemberships).ThenInclude(sm => sm.Sprint)
            .Include(m => m.PointAwards)
            .FirstOrDefaultAsync();

        if (member is null) return [];

        var history = new List<PointHistoryEntryDto>();

        // Badge/achievement points
        foreach (var ma in member.Achievements.OrderBy(a => a.AwardedAt))
        {
            var source = ma.Achievement.Category == "wow" ? "wow" : "badge";
            history.Add(new PointHistoryEntryDto
            {
                Id = ma.Id,
                Source = source,
                Label = source == "wow" ? "Win of the Week" : ma.Achievement.Category,
                Points = ma.Achievement.Points,
                Reason = ma.Achievement.Name,
                AwardedAt = ma.AwardedAt
            });
        }

        // Sprint participation points
        foreach (var sm in member.SprintMemberships.OrderBy(s => s.Sprint.StartDate))
        {
            history.Add(new PointHistoryEntryDto
            {
                Id = sm.Id,
                Source = "sprint",
                Label = "Sprint",
                Points = PointsPerSprint,
                Reason = $"{sm.Sprint.Name}",
                AwardedAt = sm.Sprint.StartDate.ToDateTime(TimeOnly.MinValue)
            });
        }

        // Bonus/manual point awards
        foreach (var pa in member.PointAwards.OrderBy(p => p.AwardedAt))
        {
            history.Add(new PointHistoryEntryDto
            {
                Id = pa.Id,
                Source = "bonus",
                Label = "Bonus",
                Points = pa.Points,
                Reason = pa.Reason,
                AwardedAt = pa.AwardedAt
            });
        }

        return history.OrderByDescending(h => h.AwardedAt).ToList();
    }

    public async Task<IReadOnlyList<HiScoreGameDto>> GetHiScoresAsync()
    {
        var games = new List<HiScoreGameDto>();

        // ── 2048 ──────────────────────────────────────────────────────────────
        var p2048 = await db.Game2048Participants
            .Include(p => p.Member)
            .Include(p => p.Session)
            .Where(p => p.Session!.Status == "completed" && p.Member != null && p.Score > 0)
            .ToListAsync();

        games.Add(new HiScoreGameDto("2048", "2048", "pts", true,
            DedupeEntries(p2048
                .GroupBy(p => p.MemberId)
                .Select(g => { var b = g.MaxBy(p => p.Score)!; return (b.MemberId, FullName: $"{b.Member!.FirstName} {b.Member!.LastName}".Trim(), Score: (long)b.Score, At: (DateTimeOffset?)null, b.Member!.AvatarSeed); })
                .OrderByDescending(x => x.Score).Take(10))
        ));

        // ── Dots & Boxes ──────────────────────────────────────────────────────
        var pDnB = await db.DotsAndBoxesParticipants
            .Include(p => p.Member)
            .Include(p => p.Session)
            .Where(p => p.Session!.Status == "completed" && p.Member != null && p.MemberId != null && p.Score > 0)
            .ToListAsync();

        games.Add(new HiScoreGameDto("dots-and-boxes", "Dots & Boxes", "boxes", true,
            DedupeEntries(pDnB
                .GroupBy(p => p.MemberId!.Value)
                .Select(g => { var b = g.MaxBy(p => p.Score)!; return (b.MemberId!.Value, FullName: $"{b.Member!.FirstName} {b.Member!.LastName}".Trim(), Score: (long)b.Score, At: (DateTimeOffset?)null, b.Member!.AvatarSeed); })
                .OrderByDescending(x => x.Score).Take(10))
        ));

        // ── Quiz Classic ──────────────────────────────────────────────────────
        var pQuizClassic = await db.QuizGameParticipants
            .Include(p => p.Member)
            .Include(p => p.Session)
            .Where(p => p.Session!.GameMode == QuizGameMode.Classic && p.Session.Status == QuizGameSessionStatus.Completed && p.Member != null && p.Score > 0)
            .ToListAsync();

        games.Add(new HiScoreGameDto("quiz-classic", "Quiz Game", "correct", true,
            DedupeEntries(pQuizClassic
                .GroupBy(p => p.MemberId)
                .Select(g => { var b = g.MaxBy(p => p.Score)!; return (b.MemberId, FullName: $"{b.Member!.FirstName} {b.Member!.LastName}".Trim(), Score: (long)b.Score, At: (DateTimeOffset?)null, b.Member!.AvatarSeed); })
                .OrderByDescending(x => x.Score).Take(10))
        ));

        // ── Quiz Millionaire ──────────────────────────────────────────────────
        var pMillion = await db.QuizGameParticipants
            .Include(p => p.Member)
            .Include(p => p.Session)
            .Where(p => p.Session!.GameMode == QuizGameMode.Millionaire && p.Member != null && p.MillionaireWinnings > 0)
            .ToListAsync();

        games.Add(new HiScoreGameDto("quiz-millionaire", "Who Wants to Be a Millionaire", "pts", true,
            DedupeEntries(pMillion
                .GroupBy(p => p.MemberId)
                .Select(g => { var b = g.MaxBy(p => p.MillionaireWinnings)!; return (b.MemberId, FullName: $"{b.Member!.FirstName} {b.Member!.LastName}".Trim(), Score: b.MillionaireWinnings, At: (DateTimeOffset?)null, b.Member!.AvatarSeed); })
                .OrderByDescending(x => x.Score).Take(10))
        ));

        // ── Threes ────────────────────────────────────────────────────────────
        var pThrees = await db.GameThreesParticipants
            .Include(p => p.Member)
            .Include(p => p.Session)
            .Where(p => p.Session!.Status == "completed" && p.Member != null && p.Score > 0)
            .ToListAsync();

        games.Add(new HiScoreGameDto("threes", "Threes!", "pts", true,
            DedupeEntries(pThrees
                .GroupBy(p => p.MemberId)
                .Select(g => { var b = g.MaxBy(p => p.Score)!; return (b.MemberId, FullName: $"{b.Member!.FirstName} {b.Member!.LastName}".Trim(), Score: (long)b.Score, At: (DateTimeOffset?)null, b.Member!.AvatarSeed); })
                .OrderByDescending(x => x.Score).Take(10))
        ));



        // ── Wordle (fewest guesses to win) ────────────────────────────────────
        var pWordle = await db.WordleParticipants
            .Include(p => p.Member)
            .Where(p => p.Status == WordleParticipantStatus.Won && p.Member != null && p.GuessCount > 0)
            .ToListAsync();

        games.Add(new HiScoreGameDto("wordle", "Wordle", "guesses", false,
            DedupeEntries(pWordle
                .GroupBy(p => p.MemberId)
                .Select(g => { var b = g.MinBy(p => p.GuessCount)!; return (b.MemberId, FullName: $"{b.Member!.FirstName} {b.Member!.LastName}".Trim(), Score: (long)b.GuessCount, At: b.FinishedAt, b.Member!.AvatarSeed); })
                .OrderBy(x => x.Score).Take(10))
        ));

        // ── Wordle Royale (ELO rating) ────────────────────────────────────────
        var royaleRatings = await db.WordleRoyaleRatings
            .Include(r => r.Member)
            .Where(r => r.Member != null && (r.Wins + r.Losses + r.Draws) > 0)
            .ToListAsync();

        games.Add(new HiScoreGameDto("wordle-royale", "Wordle Royale", "ELO", true,
            DedupeEntries(royaleRatings
                .OrderByDescending(r => r.Elo).Take(10)
                .Select(r => (r.MemberId, FullName: $"{r.Member!.FirstName} {r.Member!.LastName}".Trim(), Score: (long)r.Elo, At: (DateTimeOffset?)r.LastUpdatedAt, r.Member!.AvatarSeed)))
        ));

        // ── Ultimate TTT (most wins) ──────────────────────────────────────────
        var pTtt = await db.GameUltimateTttParticipants
            .Include(p => p.Member)
            .Include(p => p.Session)
            .Where(p => p.Session!.Status == "completed" && p.Member != null && !p.IsAi && p.IsWinner)
            .ToListAsync();

        games.Add(new HiScoreGameDto("ultimate-ttt", "Ultimate Tic-Tac-Toe", "wins", true,
            DedupeEntries(pTtt
                .GroupBy(p => p.MemberId!.Value)
                .Select(g => { var b = g.First(); return (b.MemberId!.Value, FullName: $"{b.Member!.FirstName} {b.Member!.LastName}".Trim(), Score: (long)g.Count(), At: (DateTimeOffset?)null, b.Member!.AvatarSeed); })
                .OrderByDescending(x => x.Score).Take(10))
        ));

        return games.Where(g => g.Entries.Count > 0).ToList();
    }

    private static List<HiScoreEntryDto> DedupeEntries(IEnumerable<(Guid MemberId, string FullName, long Score, DateTimeOffset? At, string? AvatarSeed)> ranked)
    {
        var list = ranked.ToList();
        var names = GameNameHelper.DeduplicateFirstNames(list.Select(x => x.FullName).ToArray());
        return list.Select((x, i) => new HiScoreEntryDto(i + 1, x.MemberId, names[i], x.Score, x.At, x.AvatarSeed)).ToList();
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

            // WoW category gets its own breakdown source
            if (group.Key == "wow")
            {
                breakdown.Add(new PointBreakdownItem("wow", "Win of the Week", pts, group.Count()));
            }
            else
            {
                breakdown.Add(new PointBreakdownItem("badge", group.Key, pts, group.Count()));
            }
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
            AvatarSeed = m.AvatarSeed,
            TotalPoints = badgePoints + sprintPoints + bonusPoints,
            BadgePoints = badgePoints,
            SprintPoints = sprintPoints,
            BonusPoints = bonusPoints,
            Breakdown = breakdown
        };
    }
}
