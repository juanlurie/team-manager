using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.WinOfTheMonth;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class WinOfMonthService(AppDbContext db) : IWinOfMonthService
{
    private const int MaxVotesPerPerson = 3;
    private const int VotingDays = 5;
    private const int MinWeeklyWinners = 4;

    public async Task<WinMonthDto?> GetCurrentMonthAsync(Guid memberId)
    {
        var now = DateTimeOffset.UtcNow;
        var currentMonth = now.Month;
        var currentYear = now.Year;

        var month = await db.WinMonths
            .Include(m => m.Nominations).ThenInclude(n => n.Nominee)
            .Include(m => m.Nominations).ThenInclude(n => n.SourceWinWeek)
            .Include(m => m.Nominations).ThenInclude(n => n.Votes)
            .FirstOrDefaultAsync(m => m.Year == currentYear && m.Month == currentMonth);

        if (month is null)
        {
            month = await TryAutoGenerateAsync(currentYear, currentMonth, memberId);
            if (month is null) return null;
        }

        if (month.Status == WinMonthStatus.Voting && month.VotingEndsAt.HasValue && month.VotingEndsAt <= now)
        {
            month = await CloseMonthInternalAsync(month);
        }

        return BuildMonthDto(month, memberId);
    }

    public async Task<IReadOnlyList<WinMonthHistoryDto>> GetHistoryAsync(int? year = null)
    {
        var query = db.WinMonths
            .Where(m => m.Status == WinMonthStatus.Closed && m.WinnerNominationId.HasValue)
            .AsQueryable();

        if (year.HasValue)
            query = query.Where(m => m.Year == year.Value);

        var months = await query
            .OrderByDescending(m => m.Year)
            .ThenByDescending(m => m.Month)
            .ToListAsync();

        var result = new List<WinMonthHistoryDto>();
        foreach (var month in months)
        {
            var winner = await db.WinMonthNominations
                .Include(n => n.Nominee)
                .Include(n => n.Votes)
                .FirstOrDefaultAsync(n => n.Id == month.WinnerNominationId);

            result.Add(new WinMonthHistoryDto
            {
                Id = month.Id,
                Year = month.Year,
                Month = month.Month,
                MonthName = GetMonthName(month.Year, month.Month),
                WinnerNomineeName = winner != null ? $"{winner.Nominee.FirstName} {winner.Nominee.LastName}" : null,
                WinnerTitle = winner?.Title,
                WinnerVoteCount = winner?.Votes.Count ?? 0,
                ClosedAt = month.ClosedAt ?? DateTimeOffset.UtcNow
            });
        }

        return result;
    }

    public async Task<WinMonthVoteDto> VoteAsync(Guid memberId, Guid nominationId)
    {
        var nomination = await db.WinMonthNominations
            .Include(n => n.WinMonth)
            .FirstOrDefaultAsync(n => n.Id == nominationId);

        if (nomination is null)
            throw new KeyNotFoundException("Nomination not found.");

        if (nomination.WinMonth.Status != WinMonthStatus.Voting)
            throw new InvalidOperationException("Voting is not open for this month.");

        if (nomination.WinMonth.VotingEndsAt.HasValue && nomination.WinMonth.VotingEndsAt <= DateTimeOffset.UtcNow)
            throw new InvalidOperationException("Voting has closed for this month.");

        if (nomination.NomineeMemberId == memberId)
            throw new InvalidOperationException("You cannot vote for your own nomination.");

        var existingVote = await db.WinMonthVotes
            .FirstOrDefaultAsync(v => v.WinMonthNominationId == nominationId && v.TeamMemberId == memberId);

        if (existingVote is not null)
            throw new InvalidOperationException("You have already voted for this nomination.");

        var monthVoteCount = await db.WinMonthVotes
            .Join(db.WinMonthNominations, v => v.WinMonthNominationId, n => n.Id, (v, n) => new { v, n })
            .CountAsync(x => x.v.TeamMemberId == memberId && x.n.WinMonthId == nomination.WinMonthId);

        if (monthVoteCount >= MaxVotesPerPerson)
            throw new InvalidOperationException($"You can only vote up to {MaxVotesPerPerson} times per month.");

        var vote = new WinMonthVote
        {
            WinMonthNominationId = nominationId,
            TeamMemberId = memberId
        };

        db.WinMonthVotes.Add(vote);
        nomination.VoteCount++;
        await db.SaveChangesAsync();

        return new WinMonthVoteDto
        {
            Id = vote.Id,
            WinMonthNominationId = vote.WinMonthNominationId,
            TeamMemberId = vote.TeamMemberId,
            VotedAt = vote.VotedAt
        };
    }

    public async Task<bool> RemoveVoteAsync(Guid memberId, Guid nominationId)
    {
        var vote = await db.WinMonthVotes
            .FirstOrDefaultAsync(v => v.WinMonthNominationId == nominationId && v.TeamMemberId == memberId);

        if (vote is null) return false;

        var nomination = await db.WinMonthNominations.FindAsync(vote.WinMonthNominationId);
        if (nomination is not null)
            nomination.VoteCount--;

        db.WinMonthVotes.Remove(vote);
        await db.SaveChangesAsync();

        return true;
    }

    public async Task<WinMonthDto> CloseMonthAsync(Guid memberId)
    {
        var now = DateTimeOffset.UtcNow;
        var month = await db.WinMonths
            .Include(m => m.Nominations).ThenInclude(n => n.Votes)
            .FirstOrDefaultAsync(m => m.Year == now.Year && m.Month == now.Month && m.Status == WinMonthStatus.Voting);

        if (month is null)
            throw new InvalidOperationException("No active month to close.");

        month = await CloseMonthInternalAsync(month);
        await db.SaveChangesAsync();

        return BuildMonthDto(month, memberId);
    }

    public async Task<WinMonthDto> GenerateFromClosedWeeksAsync(Guid memberId)
    {
        var now = DateTimeOffset.UtcNow;
        var currentMonth = now.Month;
        var currentYear = now.Year;

        var existing = await db.WinMonths
            .FirstOrDefaultAsync(m => m.Year == currentYear && m.Month == currentMonth);

        if (existing is not null)
            throw new InvalidOperationException("A month contest already exists for this period.");

        var closedWeeks = await db.WinWeeks
            .Where(w => w.Status == WinWeekStatus.Closed
                     && w.WinnerNominationId.HasValue
                     && w.WeekStart.Month == currentMonth
                     && w.WeekStart.Year == currentYear)
            .ToListAsync();

        if (closedWeeks.Count < MinWeeklyWinners)
            throw new InvalidOperationException($"Need at least {MinWeeklyWinners} weekly winners to generate a month contest. Found {closedWeeks.Count}.");

        var month = new WinMonth
        {
            Year = currentYear,
            Month = currentMonth,
            Status = WinMonthStatus.Pending,
            VotingEndsAt = null
        };

        db.WinMonths.Add(month);
        await db.SaveChangesAsync();

        foreach (var week in closedWeeks)
        {
            var winner = await db.WinNominations
                .Include(n => n.Nominee)
                .FirstOrDefaultAsync(n => n.Id == week.WinnerNominationId);

            if (winner is null) continue;

            var nomination = new WinMonthNomination
            {
                WinMonthId = month.Id,
                SourceWinWeekId = week.Id,
                NomineeMemberId = winner.NomineeMemberId,
                Title = winner.Title,
                Description = winner.Description,
                VoteCount = 0
            };

            db.WinMonthNominations.Add(nomination);
        }

        await db.SaveChangesAsync();

        month = await db.WinMonths
            .Include(m => m.Nominations).ThenInclude(n => n.Nominee)
            .Include(m => m.Nominations).ThenInclude(n => n.SourceWinWeek)
            .Include(m => m.Nominations).ThenInclude(n => n.Votes)
            .FirstAsync(m => m.Id == month.Id);

        return BuildMonthDto(month, memberId);
    }

    public async Task<WinMonthDto> OpenVotingAsync(Guid memberId)
    {
        var now = DateTimeOffset.UtcNow;
        var currentMonth = now.Month;
        var currentYear = now.Year;

        var month = await db.WinMonths
            .Include(m => m.Nominations).ThenInclude(n => n.Nominee)
            .Include(m => m.Nominations).ThenInclude(n => n.SourceWinWeek)
            .Include(m => m.Nominations).ThenInclude(n => n.Votes)
            .FirstOrDefaultAsync(m => m.Year == currentYear && m.Month == currentMonth);

        if (month is null)
            throw new InvalidOperationException("No month contest found. Generate one first.");

        if (month.Status != WinMonthStatus.Pending)
            throw new InvalidOperationException("Voting can only be opened for pending contests.");

        if (month.Nominations.Count == 0)
            throw new InvalidOperationException("Cannot open voting with no nominations.");

        month.Status = WinMonthStatus.Voting;
        month.VotingEndsAt = now.AddDays(VotingDays);

        await db.SaveChangesAsync();

        return BuildMonthDto(month, memberId);
    }

    private async Task<WinMonth?> TryAutoGenerateAsync(int year, int month, Guid memberId)
    {
        var closedWeeks = await db.WinWeeks
            .Where(w => w.Status == WinWeekStatus.Closed
                     && w.WinnerNominationId.HasValue
                     && w.WeekStart.Month == month
                     && w.WeekStart.Year == year)
            .ToListAsync();

        if (closedWeeks.Count < MinWeeklyWinners) return null;

        var existing = await db.WinMonths
            .FirstOrDefaultAsync(m => m.Year == year && m.Month == month);

        if (existing is not null) return existing;

        var now = DateTimeOffset.UtcNow;
        var newMonth = new WinMonth
        {
            Year = year,
            Month = month,
            Status = WinMonthStatus.Pending,
            VotingEndsAt = null
        };

        db.WinMonths.Add(newMonth);
        await db.SaveChangesAsync();

        foreach (var week in closedWeeks)
        {
            var winner = await db.WinNominations
                .Include(n => n.Nominee)
                .FirstOrDefaultAsync(n => n.Id == week.WinnerNominationId);

            if (winner is null) continue;

            db.WinMonthNominations.Add(new WinMonthNomination
            {
                WinMonthId = newMonth.Id,
                SourceWinWeekId = week.Id,
                NomineeMemberId = winner.NomineeMemberId,
                Title = winner.Title,
                Description = winner.Description,
                VoteCount = 0
            });
        }

        await db.SaveChangesAsync();

        return await db.WinMonths
            .Include(m => m.Nominations).ThenInclude(n => n.Nominee)
            .Include(m => m.Nominations).ThenInclude(n => n.SourceWinWeek)
            .Include(m => m.Nominations).ThenInclude(n => n.Votes)
            .FirstOrDefaultAsync(m => m.Id == newMonth.Id);
    }

    private async Task<WinMonth> CloseMonthInternalAsync(WinMonth month)
    {
        month.Status = WinMonthStatus.Closed;
        month.ClosedAt = DateTimeOffset.UtcNow;

        var winner = month.Nominations
            .OrderByDescending(n => n.VoteCount)
            .FirstOrDefault();

        if (winner is not null)
        {
            month.WinnerNominationId = winner.Id;
        }

        await db.SaveChangesAsync();

        // Award monthly champion achievement
        if (winner is not null)
        {
            await AwardMonthlyChampionAsync(winner.NomineeMemberId, month.Year, month.Month);
        }

        // Award voter achievements
        var voterIds = await db.WinMonthVotes
            .Join(db.WinMonthNominations, v => v.WinMonthNominationId, n => n.Id, (v, n) => new { v, n })
            .Where(x => x.n.WinMonthId == month.Id)
            .Select(x => x.v.TeamMemberId)
            .Distinct()
            .ToListAsync();

        var monthLabel = GetMonthName(month.Year, month.Month);
        foreach (var voterId in voterIds)
        {
            await AwardMonthlyVoterAsync(voterId, monthLabel);
        }

        return month;
    }

    private async Task AwardMonthlyChampionAsync(Guid winnerMemberId, int year, int month)
    {
        var achievement = await db.Achievements
            .FirstOrDefaultAsync(a => a.Key == "win-of-month-champion");

        if (achievement is null) return;

        var monthLabel = GetMonthName(year, month);
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
            Reason = $"Win of the Month Champion — {monthLabel}",
            AwardedAt = DateTimeOffset.UtcNow
        });

        await db.SaveChangesAsync();
    }

    private async Task AwardMonthlyVoterAsync(Guid voterMemberId, string monthLabel)
    {
        var achievement = await db.Achievements
            .FirstOrDefaultAsync(a => a.Key == "win-of-month-voter");

        if (achievement is null) return;

        var alreadyAwarded = await db.MemberAchievements
            .AnyAsync(ma => ma.TeamMemberId == voterMemberId
                         && ma.AchievementId == achievement.Id
                         && ma.Note == monthLabel);

        if (alreadyAwarded) return;

        db.MemberAchievements.Add(new MemberAchievement
        {
            TeamMemberId = voterMemberId,
            AchievementId = achievement.Id,
            AwardedAt = DateTimeOffset.UtcNow,
            Note = monthLabel
        });

        db.PointAwards.Add(new PointAward
        {
            TeamMemberId = voterMemberId,
            Points = achievement.Points,
            Reason = $"Win of the Month Voter — {monthLabel}",
            AwardedAt = DateTimeOffset.UtcNow
        });

        await db.SaveChangesAsync();
    }

    private static WinMonthDto BuildMonthDto(WinMonth month, Guid memberId)
    {
        var userVoteIds = month.Nominations
            .Where(n => n.Votes.Any(v => v.TeamMemberId == memberId))
            .Select(n => n.Id)
            .ToList();

        var userVoteCount = userVoteIds.Count;

        WinMonthNomination? winner = null;
        if (month.WinnerNominationId.HasValue)
        {
            winner = month.Nominations.FirstOrDefault(n => n.Id == month.WinnerNominationId.Value);
        }

        return new WinMonthDto
        {
            Id = month.Id,
            Year = month.Year,
            Month = month.Month,
            Status = month.Status.ToString(),
            MonthName = GetMonthName(month.Year, month.Month),
            VotingEndsAt = month.VotingEndsAt,
            WinnerNominationId = month.WinnerNominationId,
            WinnerNomineeName = winner != null ? $"{winner.Nominee.FirstName} {winner.Nominee.LastName}" : null,
            WinnerTitle = winner?.Title,
            CurrentMemberId = memberId,
            UserVotesRemaining = MaxVotesPerPerson - userVoteCount,
            HasUserVoted = userVoteCount > 0,
            Nominations = month.Nominations.Select(n => new WinMonthNominationDto
            {
                Id = n.Id,
                SourceWinWeekId = n.SourceWinWeekId,
                NomineeName = $"{n.Nominee.FirstName} {n.Nominee.LastName}",
                Title = n.Title,
                Description = n.Description,
                VoteCount = n.VoteCount,
                HasVoted = userVoteIds.Contains(n.Id),
                SourceWeekStart = n.SourceWinWeek.WeekStart
            }).OrderByDescending(n => n.VoteCount).ToList()
        };
    }

    private static string GetMonthName(int year, int month)
    {
        return new DateTime(year, month, 1).ToString("MMMM yyyy");
    }
}
