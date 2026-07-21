using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.RetroBoard;
using TeamManager.Api.Domain.Entities;
using static TeamManager.Api.Domain.Entities.RetroBoardConstants;

namespace TeamManager.Api.Application.Services;

// Guest (non-member) access to a retro board: join by slug with a display name, gated by
// AllowGuestJoin. The guest's identity is a server-issued session id (see GuestSessionManager);
// this layer only ever *receives* it, never mints or trusts a client-supplied one.
// See docs/session-identity.md. NOTE: guest authoring of notes/votes is a later slice — a guest
// here can join and watch, not yet contribute.
public partial class RetroBoardService
{
    /// <summary>Longest guest display name we store; anything longer is truncated, not rejected.</summary>
    public const int MaxGuestNameLength = 60;

    /// <summary>The guest-facing view of a board reachable by its slug, or null when the slug doesn't
    /// resolve <b>or</b> the session doesn't allow guests. Callers surface both as 404 on purpose: a
    /// guests-off board is indistinguishable from a bad link, so there's no enumeration signal.</summary>
    public async Task<GuestRetroBoardDto?> GetGuestBoardAsync(string slug, string? guestSessionId)
    {
        var session = await ResolveGuestBoardAsync(slug);
        if (session is null) return null;

        var me = guestSessionId is null
            ? null
            : session.Participants.FirstOrDefault(p => p.GuestSessionId == guestSessionId);

        return new GuestRetroBoardDto
        {
            Board = ToDto(session, memberId: null),
            HasJoined = me is not null,
            DisplayName = me?.DisplayName,
        };
    }

    /// <summary>Join (or rejoin) a board as a guest. Rejoining with the same guest session id updates
    /// the existing row instead of duplicating the guest.</summary>
    public async Task<(RetroActionResult result, GuestRetroBoardDto? board)> JoinGuestAsync(
        string slug, string guestSessionId, string? displayName)
    {
        var name = displayName?.Trim();
        if (string.IsNullOrEmpty(name)) return (RetroActionResult.Invalid, null);
        if (name.Length > MaxGuestNameLength) name = name[..MaxGuestNameLength];

        var sessionId = await ResolveSessionIdAsync(slug);
        if (sessionId is null) return (RetroActionResult.NotFound, null);

        var session = await db.RetroBoardSessions.FindAsync(sessionId.Value);
        // A guests-off (or missing) board returns NotFound, never Forbidden — same no-enumeration
        // posture as the read path: an un-invited guest can't tell the board exists.
        if (session is null || !session.AllowGuestJoin) return (RetroActionResult.NotFound, null);
        if (session.Status == Status.Closed) return (RetroActionResult.Closed, null);

        var existing = await db.RetroBoardParticipants
            .FirstOrDefaultAsync(p => p.RetroBoardSessionId == sessionId.Value && p.GuestSessionId == guestSessionId);
        if (existing is null)
        {
            db.RetroBoardParticipants.Add(new RetroBoardParticipant
            {
                RetroBoardSessionId = sessionId.Value,
                MemberId = null,
                GuestSessionId = guestSessionId,
                DisplayName = name,
                Role = Role.Participant,
            });
        }
        else
        {
            existing.DisplayName = name;
            existing.LastSeenAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync();
        Broadcast(sessionId.Value, "rb_participant_changed");

        return (RetroActionResult.Ok, await GetGuestBoardAsync(slug, guestSessionId));
    }

    /// <summary>Loads the full board graph for the guest read path, but only when the session opts into
    /// guests — so the guest projection is never built for a board that hasn't allowed it.</summary>
    private async Task<RetroBoardSession?> ResolveGuestBoardAsync(string slug)
    {
        var sessionId = await ResolveSessionIdAsync(slug);
        if (sessionId is null) return null;
        var session = await LoadFullAsync(sessionId.Value);
        return session is { AllowGuestJoin: true } ? session : null;
    }
}
