using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.WinOfTheWeek;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Application.Services;

public class WinOfTheWeekService(AppDbContext db) : IWinOfTheWeekService
{
    private const int MaxNominationsPerPerson = 3;
    private const int MaxVotesPerPerson = 3;

    public async Task<WinWeekDto> GetCurrentWeekAsync(Guid currentMemberId)
    {
        var week = await GetOrCreateCurrentWeekAsync(currentMemberId);

        var nominations = await db.WinNominations
            .Include(n => n.TeamMember)
            .Include(n => n.Nominee)
            .Include(n => n.Votes)
            .Where(n => n.WinWeekId == week.Id)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        var userVoteNominationIds = await db.WinVotes
            .Where(v => v.TeamMemberId == currentMemberId && nominations.Select(n => n.Id).Contains(v.WinNominationId))
            .Select(v => v.WinNominationId)
            .ToListAsync();

        var userNominationCount = await db.WinNominations
            .CountAsync(n => n.WinWeekId == week.Id && n.TeamMemberId == currentMemberId);

        var userVoteCount = await db.WinVotes
            .CountAsync(v => v.TeamMemberId == currentMemberId && nominations.Select(n => n.Id).Contains(v.WinNominationId));

        WinNomination? winner = null;
        if (week.WinnerNominationId.HasValue)
        {
            winner = nominations.FirstOrDefault(n => n.Id == week.WinnerNominationId.Value);
        }

        return new WinWeekDto
        {
            Id = week.Id,
            WeekStart = week.WeekStart,
            Status = week.Status.ToString(),
            WinnerNominationId = week.WinnerNominationId,
            WinnerTitle = winner?.Title,
            WinnerNomineeName = winner != null ? $"{winner.Nominee.FirstName} {winner.Nominee.LastName}" : null,
            OpenedAt = week.OpenedAt,
            ClosedAt = week.ClosedAt,
            CurrentMemberId = currentMemberId,
            UserVotesRemaining = week.Status == WinWeekStatus.SuddenDeath ? 999 : MaxVotesPerPerson - userVoteCount,
            UserNominationsRemaining = MaxNominationsPerPerson - userNominationCount,
            TiedNominationIds = week.TiedNominationIds != null
                ? JsonSerializer.Deserialize<List<Guid>>(week.TiedNominationIds) ?? []
                : [],
            Nominations = nominations.Select(n => new WinNominationDto
            {
                Id = n.Id,
                WinWeekId = n.WinWeekId,
                TeamMemberId = n.TeamMemberId,
                TeamMemberName = $"{n.TeamMember.FirstName} {n.TeamMember.LastName}",
                NomineeMemberId = n.NomineeMemberId,
                NomineeName = $"{n.Nominee.FirstName} {n.Nominee.LastName}",
                Title = n.Title,
                Description = n.Description,
                CreatedAt = n.CreatedAt,
                VoteCount = n.Votes.Count,
                HasVoted = userVoteNominationIds.Contains(n.Id)
            }).ToList()
        };
    }

    public async Task<WinNominationDto> CreateNominationAsync(Guid memberId, CreateNominationRequest request)
    {
        var week = await GetOrCreateCurrentWeekAsync(memberId);

        if (week.Status != WinWeekStatus.Nominating && week.Status != WinWeekStatus.Voting)
            throw new InvalidOperationException("Nominations are not open for the current week.");

        var count = await db.WinNominations
            .CountAsync(n => n.WinWeekId == week.Id && n.TeamMemberId == memberId);

        if (count >= MaxNominationsPerPerson)
            throw new InvalidOperationException($"You can only submit up to {MaxNominationsPerPerson} nominations per week.");

        var nomination = new WinNomination
        {
            WinWeekId = week.Id,
            TeamMemberId = memberId,
            NomineeMemberId = request.NomineeMemberId,
            Title = request.Title,
            Description = request.Description
        };

        db.WinNominations.Add(nomination);
        await db.SaveChangesAsync();

        await db.Entry(nomination).Reference(n => n.TeamMember).LoadAsync();
        await db.Entry(nomination).Reference(n => n.Nominee).LoadAsync();

        return new WinNominationDto
        {
            Id = nomination.Id,
            WinWeekId = nomination.WinWeekId,
            TeamMemberId = nomination.TeamMemberId,
            TeamMemberName = $"{nomination.TeamMember.FirstName} {nomination.TeamMember.LastName}",
            NomineeMemberId = nomination.NomineeMemberId,
            NomineeName = $"{nomination.Nominee.FirstName} {nomination.Nominee.LastName}",
            Title = nomination.Title,
            Description = nomination.Description,
            CreatedAt = nomination.CreatedAt,
            VoteCount = 0,
            HasVoted = false
        };
    }

    public async Task<WinNominationDto> UpdateNominationAsync(Guid memberId, Guid nominationId, CreateNominationRequest request)
    {
        var nomination = await db.WinNominations
            .Include(n => n.TeamMember)
            .Include(n => n.Nominee)
            .Include(n => n.WinWeek)
            .FirstOrDefaultAsync(n => n.Id == nominationId);

        if (nomination is null)
            throw new KeyNotFoundException("Nomination not found.");

        if (nomination.TeamMemberId != memberId)
            throw new InvalidOperationException("You can only edit your own nominations.");

        if (nomination.WinWeek.Status != WinWeekStatus.Nominating)
            throw new InvalidOperationException("Nominations can only be edited before voting opens.");

        nomination.Title = request.Title;
        nomination.Description = request.Description;
        nomination.NomineeMemberId = request.NomineeMemberId;

        await db.SaveChangesAsync();

        return new WinNominationDto
        {
            Id = nomination.Id,
            WinWeekId = nomination.WinWeekId,
            TeamMemberId = nomination.TeamMemberId,
            TeamMemberName = $"{nomination.TeamMember.FirstName} {nomination.TeamMember.LastName}",
            NomineeMemberId = nomination.NomineeMemberId,
            NomineeName = $"{nomination.Nominee.FirstName} {nomination.Nominee.LastName}",
            Title = nomination.Title,
            Description = nomination.Description,
            CreatedAt = nomination.CreatedAt,
            VoteCount = nomination.Votes.Count,
            HasVoted = false
        };
    }

    public async Task<bool> DeleteNominationAsync(Guid memberId, Guid nominationId)
    {
        var nomination = await db.WinNominations
            .Include(n => n.WinWeek)
            .FirstOrDefaultAsync(n => n.Id == nominationId);

        if (nomination is null)
            throw new KeyNotFoundException("Nomination not found.");

        if (nomination.TeamMemberId != memberId)
            throw new InvalidOperationException("You can only delete your own nominations.");

        if (nomination.WinWeek.Status != WinWeekStatus.Nominating)
            throw new InvalidOperationException("Nominations can only be deleted before voting opens.");

        db.WinNominations.Remove(nomination);
        await db.SaveChangesAsync();

        return true;
    }

    public async Task<WinVoteDto> VoteAsync(Guid memberId, Guid nominationId)
    {
        var nomination = await db.WinNominations
            .Include(n => n.WinWeek)
            .FirstOrDefaultAsync(n => n.Id == nominationId);

        if (nomination is null)
            throw new KeyNotFoundException("Nomination not found.");

        var week = nomination.WinWeek;
        if (week.Status != WinWeekStatus.Voting && week.Status != WinWeekStatus.SuddenDeath)
            throw new InvalidOperationException("Voting is not open for the current week.");

        var existingVote = await db.WinVotes
            .FirstOrDefaultAsync(v => v.WinNominationId == nominationId && v.TeamMemberId == memberId);

        if (existingVote is not null)
            throw new InvalidOperationException("You have already voted for this nomination.");

        if (week.Status == WinWeekStatus.Voting)
        {
            var weekVoteCount = await db.WinVotes
                .CountAsync(v => v.TeamMemberId == memberId && v.WinNomination.WinWeekId == nomination.WinWeekId);

            if (weekVoteCount >= MaxVotesPerPerson)
                throw new InvalidOperationException($"You can only vote up to {MaxVotesPerPerson} times per week.");
        }

        var vote = new WinVote
        {
            WinNominationId = nominationId,
            TeamMemberId = memberId
        };

        db.WinVotes.Add(vote);
        await db.SaveChangesAsync();

        if (week.Status == WinWeekStatus.SuddenDeath)
        {
            await CheckAndAutoCloseSuddenDeathAsync(week);
        }

        return new WinVoteDto
        {
            Id = vote.Id,
            WinNominationId = vote.WinNominationId,
            TeamMemberId = vote.TeamMemberId,
            VotedAt = vote.VotedAt
        };
    }

    public async Task<bool> RemoveVoteAsync(Guid memberId, Guid nominationId)
    {
        var vote = await db.WinVotes
            .FirstOrDefaultAsync(v => v.WinNominationId == nominationId && v.TeamMemberId == memberId);

        if (vote is null) return false;

        db.WinVotes.Remove(vote);
        await db.SaveChangesAsync();

        return true;
    }

    public async Task<WinWeekDto> CloseWeekAsync(Guid memberId, CloseWeekRequest request)
    {
        var today = DateOnly.FromDateTime(DateTimeOffset.UtcNow.Date);
        var weekStart = GetWeekStart(today);

        var week = await db.WinWeeks
            .Include(w => w.Nominations)
            .FirstOrDefaultAsync(w => w.WeekStart == weekStart && w.Status == WinWeekStatus.Voting);

        if (week is null)
            throw new InvalidOperationException("No active voting week found to close.");

        var nomination = week.Nominations.FirstOrDefault(n => n.Id == request.WinnerNominationId);
        if (nomination is null)
            throw new KeyNotFoundException("The specified nomination does not belong to the current week.");

        week.Status = WinWeekStatus.Closed;
        week.WinnerNominationId = request.WinnerNominationId;
        week.ClosedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync();

        // Award weekly achievement to the winner
        await AwardWeeklyAchievementAsync(nomination.NomineeMemberId, week.WeekStart);

        return await GetCurrentWeekAsync(memberId);
    }

    public async Task<WinWeekDto> OpenNextWeekAsync(Guid memberId)
    {
        var latestWeek = await db.WinWeeks
            .OrderByDescending(w => w.WeekStart)
            .FirstOrDefaultAsync();

        DateOnly weekStart;
        if (latestWeek is not null)
        {
            if (latestWeek.Status != WinWeekStatus.Closed)
                throw new InvalidOperationException("Cannot open a new week while the current week is still active. Close it first.");

            weekStart = latestWeek.WeekStart.AddDays(7);
        }
        else
        {
            var today = DateOnly.FromDateTime(DateTimeOffset.UtcNow.Date);
            weekStart = GetWeekStart(today);
        }

        var existing = await db.WinWeeks
            .FirstOrDefaultAsync(w => w.WeekStart == weekStart);

        if (existing is not null)
            throw new InvalidOperationException("A week already exists for this period.");

        var week = new WinWeek
        {
            WeekStart = weekStart,
            WeekEnd = weekStart.AddDays(6),
            Status = WinWeekStatus.Nominating,
            CreatedByMemberId = memberId
        };

        db.WinWeeks.Add(week);
        await db.SaveChangesAsync();

        return await GetCurrentWeekAsync(memberId);
    }

    public async Task<WinWeekDto> OpenVotingAsync(Guid memberId)
    {
        var today = DateOnly.FromDateTime(DateTimeOffset.UtcNow.Date);
        var weekStart = GetWeekStart(today);

        var week = await db.WinWeeks
            .Include(w => w.Nominations)
            .FirstOrDefaultAsync(w => w.WeekStart == weekStart);

        if (week is null)
            throw new InvalidOperationException("No week found for the current period. Open next week first.");

        if (week.Status != WinWeekStatus.Nominating)
            throw new InvalidOperationException("Voting can only be opened during the nominating phase.");

        if (week.Nominations.Count == 0)
            throw new InvalidOperationException("Cannot open voting with no nominations.");

        week.Status = WinWeekStatus.Voting;
        await db.SaveChangesAsync();

        return await GetCurrentWeekAsync(memberId);
    }

    public async Task<WinWeekDto> StartSuddenDeathAsync(Guid memberId, StartSuddenDeathRequest request)
    {
        var today = DateOnly.FromDateTime(DateTimeOffset.UtcNow.Date);
        var weekStart = GetWeekStart(today);

        var week = await db.WinWeeks
            .Include(w => w.Nominations)
            .FirstOrDefaultAsync(w => w.WeekStart == weekStart);

        if (week is null)
            throw new InvalidOperationException("No week found for the current period.");

        if (week.Status != WinWeekStatus.Voting)
            throw new InvalidOperationException("Sudden death can only be started during voting phase.");

        if (request.TiedNominationIds.Count < 2)
            throw new InvalidOperationException("Sudden death requires at least 2 tied nominations.");

        var tiedIds = request.TiedNominationIds.ToHashSet();
        var validNominations = week.Nominations.Where(n => tiedIds.Contains(n.Id)).ToList();
        if (validNominations.Count != request.TiedNominationIds.Count)
            throw new InvalidOperationException("One or more tied nominations do not belong to the current week.");

        week.Status = WinWeekStatus.SuddenDeath;
        week.TiedNominationIds = JsonSerializer.Serialize(request.TiedNominationIds);
        await db.SaveChangesAsync();

        return await GetCurrentWeekAsync(memberId);
    }

    public async Task<IReadOnlyList<WinWeekHistoryDto>> GetHistoryAsync(int? year = null, int limit = 52)
    {
        var query = db.WinWeeks
            .Where(w => w.Status == WinWeekStatus.Closed && w.WinnerNominationId.HasValue)
            .AsQueryable();

        if (year.HasValue)
            query = query.Where(w => w.WeekStart.Year == year.Value);

        var weeks = await query
            .OrderByDescending(w => w.WeekStart)
            .Take(limit)
            .ToListAsync();

        var winnerIds = weeks.Where(w => w.WinnerNominationId.HasValue).Select(w => w.WinnerNominationId!.Value).ToList();
        if (winnerIds.Count == 0) return [];

        var winners = await db.WinNominations
            .Include(n => n.Nominee)
            .Include(n => n.Votes)
            .Where(n => winnerIds.Contains(n.Id))
            .ToListAsync();

        var winnerLookup = winners.ToDictionary(w => w.Id);

        return weeks.Select(week =>
        {
            var winner = week.WinnerNominationId.HasValue && winnerLookup.TryGetValue(week.WinnerNominationId.Value, out var w) ? w : null;
            return new WinWeekHistoryDto
            {
                Id = week.Id,
                WeekStart = week.WeekStart,
                WeekEnd = week.WeekEnd,
                WinnerNomineeName = winner != null ? $"{winner.Nominee.FirstName} {winner.Nominee.LastName}" : null,
                WinnerTitle = winner?.Title,
                WinnerDescription = winner?.Description,
                WinnerVoteCount = winner?.Votes.Count ?? 0,
                ClosedAt = week.ClosedAt ?? DateTimeOffset.UtcNow
            };
        }).ToList();
    }

    public async Task<WinWeekDetailDto> GetWeekDetailAsync(Guid weekId, Guid memberId)
    {
        var week = await db.WinWeeks
            .FirstOrDefaultAsync(w => w.Id == weekId);

        if (week is null)
            throw new KeyNotFoundException("Week not found.");

        var nominations = await db.WinNominations
            .Include(n => n.TeamMember)
            .Include(n => n.Nominee)
            .Include(n => n.Votes)
            .Where(n => n.WinWeekId == weekId)
            .OrderByDescending(n => n.Votes.Count)
            .ToListAsync();

        var userVoteIds = await db.WinVotes
            .Where(v => v.TeamMemberId == memberId && nominations.Select(n => n.Id).Contains(v.WinNominationId))
            .Select(v => v.WinNominationId)
            .ToListAsync();

        var winner = nominations.FirstOrDefault(n => n.Id == week.WinnerNominationId);

        return new WinWeekDetailDto
        {
            Id = week.Id,
            WeekStart = week.WeekStart,
            WeekEnd = week.WeekEnd,
            WinnerNomineeName = winner != null ? $"{winner.Nominee.FirstName} {winner.Nominee.LastName}" : null,
            WinnerTitle = winner?.Title,
            AllNominations = nominations.Select(n => new WinNominationDto
            {
                Id = n.Id,
                WinWeekId = n.WinWeekId,
                TeamMemberId = n.TeamMemberId,
                TeamMemberName = $"{n.TeamMember.FirstName} {n.TeamMember.LastName}",
                NomineeMemberId = n.NomineeMemberId,
                NomineeName = $"{n.Nominee.FirstName} {n.Nominee.LastName}",
                Title = n.Title,
                Description = n.Description,
                CreatedAt = n.CreatedAt,
                VoteCount = n.Votes.Count,
                HasVoted = userVoteIds.Contains(n.Id)
            }).ToList()
        };
    }

    private async Task AwardWeeklyAchievementAsync(Guid winnerMemberId, DateOnly weekStart)
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

    private async Task<WinWeek> GetOrCreateCurrentWeekAsync(Guid memberId)
    {
        var today = DateOnly.FromDateTime(DateTimeOffset.UtcNow.Date);
        var weekStart = GetWeekStart(today);

        var week = await db.WinWeeks
            .FirstOrDefaultAsync(w => w.WeekStart == weekStart);

        if (week is not null)
        {
            var dayOfWeek = today.DayOfWeek;
            if (week.Status == WinWeekStatus.Nominating && dayOfWeek >= DayOfWeek.Friday)
            {
                week.Status = WinWeekStatus.Voting;
                await db.SaveChangesAsync();
            }

            return week;
        }

        var status = today.DayOfWeek >= DayOfWeek.Friday
            ? WinWeekStatus.Voting
            : WinWeekStatus.Nominating;

        week = new WinWeek
        {
            WeekStart = weekStart,
            WeekEnd = weekStart.AddDays(6),
            Status = status,
            CreatedByMemberId = memberId
        };

        db.WinWeeks.Add(week);
        await db.SaveChangesAsync();

        return week;
    }

    private static DateOnly GetWeekStart(DateOnly date)
    {
        var diff = (7 + (int)date.DayOfWeek - (int)DayOfWeek.Monday) % 7;
        return date.AddDays(-diff);
    }

    private async Task CheckAndAutoCloseSuddenDeathAsync(WinWeek week)
    {
        if (string.IsNullOrEmpty(week.TiedNominationIds)) return;

        var tiedIds = JsonSerializer.Deserialize<List<Guid>>(week.TiedNominationIds) ?? [];
        if (tiedIds.Count == 0) return;

        var votes = await db.WinVotes
            .Where(v => tiedIds.Contains(v.WinNominationId))
            .GroupBy(v => v.WinNominationId)
            .Select(g => new { NominationId = g.Key, VoteCount = g.Count() })
            .ToListAsync();

        if (votes.Count == 0) return;

        var maxVotes = votes.Max(v => v.VoteCount);
        var leaders = votes.Where(v => v.VoteCount == maxVotes).ToList();

        if (leaders.Count == 1)
        {
            week.Status = WinWeekStatus.Closed;
            week.WinnerNominationId = leaders[0].NominationId;
            week.ClosedAt = DateTimeOffset.UtcNow;
            week.TiedNominationIds = null;
            await db.SaveChangesAsync();

            await AwardWeeklyAchievementAsync(
                (await db.WinNominations.FindAsync(leaders[0].NominationId))!.NomineeMemberId,
                week.WeekStart);

            _ = WebSocketMiddleware.BroadcastAsync("voting_closed", new
            {
                weekId = week.Id,
                winnerId = week.WinnerNominationId
            });
        }
    }
}
