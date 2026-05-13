using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.WinOfTheWeek;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class WinOfTheWeekService(AppDbContext db) : IWinOfTheWeekService
{
    private const int MaxNominationsPerPerson = 3;
    private const int MaxVotesPerPerson = 3;

    public async Task<WinWeekDto> GetCurrentWeekAsync(Guid currentMemberId)
    {
        var week = await GetOrCreateCurrentWeekAsync();

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
            UserVotesRemaining = MaxVotesPerPerson - userVoteCount,
            UserNominationsRemaining = MaxNominationsPerPerson - userNominationCount,
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
                VoteCount = n.Votes.Count,  // compute from actual votes
                HasVoted = userVoteNominationIds.Contains(n.Id)
            }).ToList()
        };
    }

    public async Task<WinNominationDto> CreateNominationAsync(Guid memberId, CreateNominationRequest request)
    {
        var week = await GetOrCreateCurrentWeekAsync();

        if (week.Status != WinWeekStatus.Nominating)
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

    public async Task<WinVoteDto> VoteAsync(Guid memberId, Guid nominationId)
    {
        var nomination = await db.WinNominations
            .Include(n => n.WinWeek)
            .FirstOrDefaultAsync(n => n.Id == nominationId);

        if (nomination is null)
            throw new KeyNotFoundException("Nomination not found.");

        if (nomination.WinWeek.Status != WinWeekStatus.Voting)
            throw new InvalidOperationException("Voting is not open for the current week.");

        if (nomination.TeamMemberId == memberId)
            throw new InvalidOperationException("You cannot vote for your own nomination.");

        var existingVote = await db.WinVotes
            .FirstOrDefaultAsync(v => v.WinNominationId == nominationId && v.TeamMemberId == memberId);

        if (existingVote is not null)
            throw new InvalidOperationException("You have already voted for this nomination.");

        var weekVoteCount = await db.WinVotes
            .CountAsync(v => v.TeamMemberId == memberId && v.WinNomination.WinWeekId == nomination.WinWeekId);

        if (weekVoteCount >= MaxVotesPerPerson)
            throw new InvalidOperationException($"You can only vote up to {MaxVotesPerPerson} times per week.");

        var vote = new WinVote
        {
            WinNominationId = nominationId,
            TeamMemberId = memberId
        };

        db.WinVotes.Add(vote);
        await db.SaveChangesAsync();

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

        return await GetCurrentWeekAsync(memberId);
    }

    public async Task<WinWeekDto> OpenNextWeekAsync(Guid memberId)
    {
        var today = DateOnly.FromDateTime(DateTimeOffset.UtcNow.Date);
        var weekStart = GetWeekStart(today);

        // Check if the current week (by date) is still active
        var currentWeek = await db.WinWeeks
            .FirstOrDefaultAsync(w => w.WeekStart == weekStart);

        if (currentWeek is not null && currentWeek.Status != WinWeekStatus.Closed)
            throw new InvalidOperationException("Cannot open a new week while the current week is still active. Close it first.");

        if (currentWeek is not null)
            throw new InvalidOperationException("A week already exists for this period.");

        var week = new WinWeek
        {
            WeekStart = weekStart,
            Status = WinWeekStatus.Nominating
        };

        db.WinWeeks.Add(week);
        await db.SaveChangesAsync();

        return await GetCurrentWeekAsync(memberId);
    }

    private async Task<WinWeek> GetOrCreateCurrentWeekAsync()
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

        // Create new week
        var status = today.DayOfWeek >= DayOfWeek.Friday
            ? WinWeekStatus.Voting
            : WinWeekStatus.Nominating;

        week = new WinWeek
        {
            WeekStart = weekStart,
            Status = status
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
}
