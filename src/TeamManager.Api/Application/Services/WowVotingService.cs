using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.WinOfTheWeek;
using TeamManager.Api.Application.Realtime;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

/// <summary>Who is voting — an authenticated member or an anonymous guest session. The vote logic is
/// identical for both; only the identity column on WinVote (and the dedup/budget filter) differs.</summary>
public readonly record struct WowVoter(Guid? MemberId, string? GuestSessionId)
{
    public static WowVoter Member(Guid id) => new(id, null);
    public static WowVoter Guest(string sessionId) => new(null, sessionId);
    public bool IsGuest => MemberId is null;
}

/// <summary>
/// Casting and removing Win of the Week votes, shared by the member and guest paths. Both services
/// used to carry a near-identical copy of this (the only difference being member-id vs guest-session
/// identity); this is the single copy they now delegate to. Also the first slice peeled off the
/// WinOfTheWeekService "god service".
/// </summary>
public class WowVotingService(AppDbContext db, IWowNotifier notifier)
{
    /// <param name="requireGuestToken">When set (guest path), the nomination's week must carry this
    /// guest token — the guest link's authorisation check. Null for the authenticated member path.</param>
    public async Task<WinVoteDto> CastVoteAsync(Guid nominationId, WowVoter voter, string? requireGuestToken = null)
    {
        var nomination = await db.WinNominations
            .Include(n => n.WinWeek)
            .FirstOrDefaultAsync(n => n.Id == nominationId)
            ?? throw new KeyNotFoundException("Nomination not found.");

        var week = nomination.WinWeek;
        if (requireGuestToken is not null && week.GuestToken != requireGuestToken)
            throw new KeyNotFoundException("Invalid or expired guest link.");

        if (week.Status is not (WinWeekStatus.Voting or WinWeekStatus.SuddenDeath))
            throw new InvalidOperationException("Voting is not open for the current week.");

        if (week.Status == WinWeekStatus.SuddenDeath)
        {
            // During sudden death every voter gets exactly one vote across the tied nominations.
            var tiedIds = JsonSerializer.Deserialize<List<Guid>>(week.TiedNominationIds ?? "[]") ?? [];
            var alreadyVoted = voter.IsGuest
                ? await db.WinVotes.AnyAsync(v => v.GuestSessionId == voter.GuestSessionId && tiedIds.Contains(v.WinNominationId))
                : await db.WinVotes.AnyAsync(v => v.TeamMemberId == voter.MemberId && tiedIds.Contains(v.WinNominationId));
            if (alreadyVoted)
                throw new InvalidOperationException("You have already cast your sudden death vote.");
        }
        else
        {
            var alreadyVotedThis = voter.IsGuest
                ? await db.WinVotes.AnyAsync(v => v.WinNominationId == nominationId && v.GuestSessionId == voter.GuestSessionId)
                : await db.WinVotes.AnyAsync(v => v.WinNominationId == nominationId && v.TeamMemberId == voter.MemberId);
            if (alreadyVotedThis)
                throw new InvalidOperationException("You have already voted for this nomination.");

            var weekVoteCount = voter.IsGuest
                ? await db.WinVotes.CountAsync(v => v.GuestSessionId == voter.GuestSessionId && v.WinNomination.WinWeekId == week.Id)
                : await db.WinVotes.CountAsync(v => v.TeamMemberId == voter.MemberId && v.WinNomination.WinWeekId == week.Id);
            if (weekVoteCount >= WinOfTheWeekLimits.MaxVotesPerPerson)
                throw new InvalidOperationException($"You can only vote up to {WinOfTheWeekLimits.MaxVotesPerPerson} times per week.");
        }

        var vote = new WinVote
        {
            WinNominationId = nominationId,
            TeamMemberId = voter.MemberId,
            GuestSessionId = voter.GuestSessionId
        };
        db.WinVotes.Add(vote);
        await db.SaveChangesAsync();

        notifier.Broadcast("vote_cast", new { nominationId, voterId = voter.MemberId }, guestAllowed: true);

        return new WinVoteDto
        {
            Id = vote.Id,
            WinNominationId = vote.WinNominationId,
            TeamMemberId = vote.TeamMemberId,
            VotedAt = vote.VotedAt
        };
    }

    public async Task<bool> RemoveVoteAsync(Guid nominationId, WowVoter voter, string? requireGuestToken = null)
    {
        if (requireGuestToken is not null)
        {
            var nomination = await db.WinNominations
                .Include(n => n.WinWeek)
                .FirstOrDefaultAsync(n => n.Id == nominationId)
                ?? throw new KeyNotFoundException("Nomination not found.");
            if (nomination.WinWeek.GuestToken != requireGuestToken)
                throw new KeyNotFoundException("Invalid or expired guest link.");
        }

        var vote = voter.IsGuest
            ? await db.WinVotes.FirstOrDefaultAsync(v => v.WinNominationId == nominationId && v.GuestSessionId == voter.GuestSessionId)
            : await db.WinVotes.FirstOrDefaultAsync(v => v.WinNominationId == nominationId && v.TeamMemberId == voter.MemberId);

        if (vote is null) return false;

        db.WinVotes.Remove(vote);
        await db.SaveChangesAsync();

        notifier.Broadcast("vote_removed", new { nominationId, voterId = voter.MemberId }, guestAllowed: true);
        return true;
    }
}
