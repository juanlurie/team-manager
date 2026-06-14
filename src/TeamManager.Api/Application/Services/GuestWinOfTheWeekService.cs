using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.WinOfTheWeek;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Application.Services;

public class GuestWinOfTheWeekService(AppDbContext db, IHttpContextAccessor httpContextAccessor, IWinOfTheWeekService wowService)
{
    private const int MaxVotesPerPerson = 3;
    public async Task<GuestTokenDto> GetOrGenerateGuestTokenAsync(Guid weekId)
    {
        var week = await db.WinWeeks.FindAsync(weekId)
            ?? throw new KeyNotFoundException("Week not found.");

        if (string.IsNullOrEmpty(week.GuestToken))
        {
            var bytes = RandomNumberGenerator.GetBytes(32);
            week.GuestToken = Convert.ToBase64String(bytes)
                .TrimEnd('=')
                .Replace('+', '-')
                .Replace('/', '_');
            await db.SaveChangesAsync();
        }

        var baseUrl = GetBaseUrl();
        return new GuestTokenDto(week.GuestToken, $"{baseUrl}/guest/wow/{week.GuestToken}");
    }

    public async Task<GuestWinWeekDto> GetWeekByTokenAsync(string token, string guestSessionId)
    {
        var week = await db.WinWeeks
            .FirstOrDefaultAsync(w => w.GuestToken == token)
            ?? throw new KeyNotFoundException("Invalid or expired guest link.");

        if (week.Status == WinWeekStatus.SuddenDeath &&
            week.SuddenDeathEndsAt.HasValue &&
            DateTimeOffset.UtcNow > week.SuddenDeathEndsAt.Value)
        {
            await wowService.AutoCloseExpiredSuddenDeathAsync(week.Id);
            // Reload week state after auto-close
            db.Entry(week).State = Microsoft.EntityFrameworkCore.EntityState.Detached;
            week = await db.WinWeeks.FirstAsync(w => w.GuestToken == token);
        }

        var nominations = await db.WinNominations
            .Include(n => n.TeamMember)
            .Include(n => n.Nominee)
            .Include(n => n.Votes)
            .Where(n => n.WinWeekId == week.Id)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        var nominationIds = nominations.Select(n => n.Id).ToList();
        var guestNominationCount = nominations.Count(n => n.GuestSessionId == guestSessionId);

        var guestVotedIds = await db.WinVotes
            .Where(v => v.GuestSessionId == guestSessionId && nominationIds.Contains(v.WinNominationId))
            .Select(v => v.WinNominationId)
            .ToListAsync();

        int guestVoteCount = guestVotedIds.Count;
        int votesRemaining = 0;

        if (week.Status == WinWeekStatus.SuddenDeath && !string.IsNullOrEmpty(week.TiedNominationIds))
        {
            var tiedIds = System.Text.Json.JsonSerializer.Deserialize<List<Guid>>(week.TiedNominationIds) ?? [];
            var suddenDeathVotes = guestVotedIds.Count(id => tiedIds.Contains(id));
            votesRemaining = Math.Max(0, 1 - suddenDeathVotes);
        }
        else if (week.Status == WinWeekStatus.Voting)
        {
            votesRemaining = Math.Max(0, MaxVotesPerPerson - guestVoteCount);
        }

        WinNomination? winner = null;
        if (week.WinnerNominationId.HasValue)
            winner = nominations.FirstOrDefault(n => n.Id == week.WinnerNominationId.Value);

        return new GuestWinWeekDto
        {
            Id = week.Id,
            WeekStart = week.WeekStart,
            Status = week.Status.ToString(),
            IsNominatingOpen = week.Status == WinWeekStatus.Nominating,
            IsVotingOpen = week.Status == WinWeekStatus.Voting || week.Status == WinWeekStatus.SuddenDeath,
            UserNominationsRemaining = Math.Max(0, 1 - guestNominationCount),
            UserVotesRemaining = votesRemaining,
            WinnerNomineeName = winner != null ? $"{winner.Nominee.FirstName} {winner.Nominee.LastName}" : null,
            WinnerTitle = winner?.Title,
            WinnerStory = week.WinnerStory,
            SuddenDeathEndsAt = week.SuddenDeathEndsAt,
            TiedNominationIds = !string.IsNullOrEmpty(week.TiedNominationIds)
                ? System.Text.Json.JsonSerializer.Deserialize<List<Guid>>(week.TiedNominationIds) ?? []
                : [],
            Nominations = nominations.Select(n => new GuestNominationDto
            {
                Id = n.Id,
                NomineeMemberId = n.NomineeMemberId,
                NomineeName = $"{n.Nominee.FirstName} {n.Nominee.LastName}",
                NominatorDisplayName = n.TeamMember != null
                    ? $"{n.TeamMember.FirstName} {n.TeamMember.LastName}"
                    : (n.GuestName ?? "Guest"),
                Title = n.Title,
                Description = n.Description,
                VoteCount = n.Votes.Count,
                HasVoted = guestVotedIds.Contains(n.Id),
                IsOwned = n.GuestSessionId == guestSessionId,
                CreatedAt = n.CreatedAt,
                PowerUp = n.PowerUp,
                ChaosCard = n.ChaosCard,
                HypeMeterCount = n.HypeMeterCount
            }).ToList()
        };
    }

    public async Task<GuestNominationDto> CreateGuestNominationAsync(string token, GuestCreateNominationRequest request)
    {
        var week = await db.WinWeeks
            .FirstOrDefaultAsync(w => w.GuestToken == token)
            ?? throw new KeyNotFoundException("Invalid or expired guest link.");

        if (week.Status != WinWeekStatus.Nominating)
            throw new InvalidOperationException("Nominations are not open for the current week.");

        var guestNominationCount = await db.WinNominations
            .CountAsync(n => n.WinWeekId == week.Id && n.GuestSessionId == request.GuestSessionId);

        if (guestNominationCount >= 1)
            throw new InvalidOperationException("You have already submitted a nomination this week.");

        var nomineeExists = await db.TeamMembers
            .AnyAsync(m => m.Id == request.NomineeMemberId && m.IsActive);

        if (!nomineeExists)
            throw new KeyNotFoundException("The selected nominee was not found.");

        var nomination = new WinNomination
        {
            WinWeekId = week.Id,
            TeamMemberId = null,
            GuestName = request.GuestName.Trim(),
            GuestSessionId = request.GuestSessionId,
            NomineeMemberId = request.NomineeMemberId,
            Title = request.Title,
            Description = request.Description
        };

        db.WinNominations.Add(nomination);
        await db.SaveChangesAsync();

        await db.Entry(nomination).Reference(n => n.Nominee).LoadAsync();

        var dto = new GuestNominationDto
        {
            Id = nomination.Id,
            NomineeMemberId = nomination.NomineeMemberId,
            NomineeName = $"{nomination.Nominee.FirstName} {nomination.Nominee.LastName}",
            NominatorDisplayName = nomination.GuestName,
            Title = nomination.Title,
            Description = nomination.Description,
            VoteCount = 0,
            CreatedAt = nomination.CreatedAt
        };

        _ = WebSocketMiddleware.BroadcastAsync("nomination_created", new { nomination = dto }, guestAllowed: true);

        return dto;
    }

    public async Task<GuestNominationDto> UpdateGuestNominationAsync(string token, Guid nominationId, string guestSessionId, GuestUpdateNominationRequest request)
    {
        var nomination = await db.WinNominations
            .Include(n => n.WinWeek)
            .Include(n => n.Nominee)
            .FirstOrDefaultAsync(n => n.Id == nominationId)
            ?? throw new KeyNotFoundException("Nomination not found.");

        if (nomination.WinWeek.GuestToken != token || nomination.GuestSessionId != guestSessionId)
            throw new InvalidOperationException("You can only edit your own nominations.");

        if (nomination.WinWeek.Status != WinWeekStatus.Nominating)
            throw new InvalidOperationException("Nominations can only be edited before voting opens.");

        var nomineeExists = await db.TeamMembers.AnyAsync(m => m.Id == request.NomineeMemberId && m.IsActive);
        if (!nomineeExists)
            throw new KeyNotFoundException("The selected nominee was not found.");

        nomination.NomineeMemberId = request.NomineeMemberId;
        nomination.Title = request.Title;
        nomination.Description = request.Description;
        await db.SaveChangesAsync();

        await db.Entry(nomination).Reference(n => n.Nominee).LoadAsync();

        var dto = new GuestNominationDto
        {
            Id = nomination.Id,
            NomineeMemberId = nomination.NomineeMemberId,
            NomineeName = $"{nomination.Nominee.FirstName} {nomination.Nominee.LastName}",
            NominatorDisplayName = nomination.GuestName ?? "Guest",
            Title = nomination.Title,
            Description = nomination.Description,
            VoteCount = 0,
            HasVoted = false,
            IsOwned = true,
            CreatedAt = nomination.CreatedAt
        };

        _ = WebSocketMiddleware.BroadcastAsync("nomination_updated", new { nomination = dto }, guestAllowed: true);
        return dto;
    }

    public async Task DeleteGuestNominationAsync(string token, Guid nominationId, string guestSessionId)
    {
        var nomination = await db.WinNominations
            .Include(n => n.WinWeek)
            .FirstOrDefaultAsync(n => n.Id == nominationId)
            ?? throw new KeyNotFoundException("Nomination not found.");

        if (nomination.WinWeek.GuestToken != token || nomination.GuestSessionId != guestSessionId)
            throw new InvalidOperationException("You can only delete your own nominations.");

        if (nomination.WinWeek.Status != WinWeekStatus.Nominating)
            throw new InvalidOperationException("Nominations can only be deleted before voting opens.");

        db.WinNominations.Remove(nomination);
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("nomination_deleted", new { nominationId }, guestAllowed: true);
    }

    public async Task<WinVoteDto> VoteAsync(string token, Guid nominationId, string guestSessionId)
    {
        var nomination = await db.WinNominations
            .Include(n => n.WinWeek)
            .FirstOrDefaultAsync(n => n.Id == nominationId)
            ?? throw new KeyNotFoundException("Nomination not found.");

        if (nomination.WinWeek.GuestToken != token)
            throw new KeyNotFoundException("Invalid or expired guest link.");

        var week = nomination.WinWeek;
        if (week.Status != WinWeekStatus.Voting && week.Status != WinWeekStatus.SuddenDeath)
            throw new InvalidOperationException("Voting is not open for the current week.");

        if (week.Status == WinWeekStatus.SuddenDeath)
        {
            var tiedIds = System.Text.Json.JsonSerializer.Deserialize<List<Guid>>(week.TiedNominationIds ?? "[]") ?? [];
            var alreadyVoted = await db.WinVotes
                .AnyAsync(v => v.GuestSessionId == guestSessionId && tiedIds.Contains(v.WinNominationId));
            if (alreadyVoted)
                throw new InvalidOperationException("You have already cast your sudden death vote.");
        }
        else
        {
            var existingVote = await db.WinVotes
                .FirstOrDefaultAsync(v => v.WinNominationId == nominationId && v.GuestSessionId == guestSessionId);
            if (existingVote is not null)
                throw new InvalidOperationException("You have already voted for this nomination.");

            var weekVoteCount = await db.WinVotes
                .CountAsync(v => v.GuestSessionId == guestSessionId && v.WinNomination.WinWeekId == week.Id);
            if (weekVoteCount >= MaxVotesPerPerson)
                throw new InvalidOperationException($"You can only vote up to {MaxVotesPerPerson} times per week.");
        }

        var vote = new WinVote
        {
            WinNominationId = nominationId,
            TeamMemberId = null,
            GuestSessionId = guestSessionId
        };

        db.WinVotes.Add(vote);
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("vote_cast", new { nominationId }, guestAllowed: true);

        return new WinVoteDto
        {
            Id = vote.Id,
            WinNominationId = vote.WinNominationId,
            TeamMemberId = null,
            VotedAt = vote.VotedAt
        };
    }

    public async Task<bool> RemoveVoteAsync(string token, Guid nominationId, string guestSessionId)
    {
        var nomination = await db.WinNominations
            .Include(n => n.WinWeek)
            .FirstOrDefaultAsync(n => n.Id == nominationId)
            ?? throw new KeyNotFoundException("Nomination not found.");

        if (nomination.WinWeek.GuestToken != token)
            throw new KeyNotFoundException("Invalid or expired guest link.");

        var vote = await db.WinVotes
            .FirstOrDefaultAsync(v => v.WinNominationId == nominationId && v.GuestSessionId == guestSessionId);

        if (vote is null) return false;

        db.WinVotes.Remove(vote);
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("vote_removed", new { nominationId }, guestAllowed: true);

        return true;
    }

    public async Task<IReadOnlyList<object>> GetMembersAsync(string token)
    {
        var weekExists = await db.WinWeeks.AnyAsync(w => w.GuestToken == token);
        if (!weekExists)
            throw new KeyNotFoundException("Invalid or expired guest link.");

        return await db.TeamMembers
            .Where(m => m.IsActive)
            .OrderBy(m => m.FirstName)
            .Select(m => new { id = m.Id, name = $"{m.FirstName} {m.LastName}" })
            .ToListAsync<object>();
    }

    private string GetBaseUrl()
    {
        var request = httpContextAccessor.HttpContext?.Request;
        if (request == null) return string.Empty;
        return $"{request.Scheme}://{request.Host}";
    }
}
