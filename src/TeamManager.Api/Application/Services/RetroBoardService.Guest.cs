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
            Board = ToDto(session, memberId: null, guestSessionId: guestSessionId),
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

    // ---------- Guest contributions (notes + votes) ----------

    /// <summary>Add a note as a guest. Attribution is the guest's session id (or nothing, when the
    /// board allows anonymous content and the guest opts in) — never a member id.</summary>
    public async Task<(RetroActionResult result, GuestRetroBoardDto? board)> AddGuestNoteAsync(
        string slug, string guestSessionId, AddRetroBoardNoteRequest req)
    {
        var (guard, session, _) = await GuardGuestAsync(slug, guestSessionId);
        if (guard != RetroActionResult.Ok) return (guard, null);
        if (string.IsNullOrWhiteSpace(req.Text)) return (RetroActionResult.Invalid, null);
        if (!await db.RetroBoardColumns.AnyAsync(c => c.Id == req.ColumnId && c.RetroBoardSessionId == session!.Id))
            return (RetroActionResult.NotFound, null);

        var anon = req.IsAnonymous && session!.AllowAnonymous;
        db.RetroBoardNotes.Add(new RetroBoardNote
        {
            RetroBoardSessionId = session!.Id,
            RetroBoardColumnId = req.ColumnId,
            AuthorGuestSessionId = anon ? null : guestSessionId,   // authorship isn't stored for anonymous notes
            IsAnonymous = anon,
            Text = req.Text.Trim(),
        });
        await db.SaveChangesAsync();
        Broadcast(session.Id, "rb_note_added", new { sessionId = session.Id });
        return (RetroActionResult.Ok, await GetGuestBoardAsync(slug, guestSessionId));
    }

    /// <summary>Delete a note as a guest — only the guest's own note.</summary>
    public async Task<(RetroActionResult result, GuestRetroBoardDto? board)> DeleteGuestNoteAsync(
        string slug, string guestSessionId, Guid noteId)
    {
        var (guard, session, _) = await GuardGuestAsync(slug, guestSessionId);
        if (guard != RetroActionResult.Ok) return (guard, null);
        var note = await db.RetroBoardNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.RetroBoardSessionId == session!.Id);
        if (note is null) return (RetroActionResult.NotFound, null);
        if (note.AuthorGuestSessionId != guestSessionId) return (RetroActionResult.Forbidden, null);   // own notes only
        db.RetroBoardNotes.Remove(note);
        await db.SaveChangesAsync();
        Broadcast(session!.Id, "rb_note_deleted", new { sessionId = session.Id, noteId });
        return (RetroActionResult.Ok, await GetGuestBoardAsync(slug, guestSessionId));
    }

    /// <summary>Cast a vote as a guest. Same caps as a member (VotesPerUser total, 3 per note), counted
    /// against the guest's session id.</summary>
    public async Task<(RetroActionResult result, string? error)> AddGuestVoteAsync(string slug, string guestSessionId, Guid noteId)
    {
        var (guard, session, _) = await GuardGuestAsync(slug, guestSessionId);
        if (guard != RetroActionResult.Ok) return (guard, guard == RetroActionResult.Closed ? "This retro is closed." : null);
        if (!await db.RetroBoardNotes.AnyAsync(n => n.Id == noteId && n.RetroBoardSessionId == session!.Id))
            return (RetroActionResult.NotFound, "Note not found.");

        var used = await db.RetroBoardVotes.CountAsync(v => v.Note!.RetroBoardSessionId == session!.Id && v.GuestSessionId == guestSessionId);
        if (used >= session!.VotesPerUser) return (RetroActionResult.Conflict, "No votes left.");
        var onThisNote = await db.RetroBoardVotes.CountAsync(v => v.RetroBoardNoteId == noteId && v.GuestSessionId == guestSessionId);
        if (onThisNote >= 3) return (RetroActionResult.Conflict, "Max 3 votes per topic.");

        db.RetroBoardVotes.Add(new RetroBoardVote { RetroBoardNoteId = noteId, GuestSessionId = guestSessionId });
        await db.SaveChangesAsync();
        Broadcast(session.Id, "rb_voted", new { sessionId = session.Id, noteId });
        return (RetroActionResult.Ok, null);
    }

    /// <summary>Remove one of the guest's own votes from a note.</summary>
    public async Task<RetroActionResult> RemoveGuestVoteAsync(string slug, string guestSessionId, Guid noteId)
    {
        var (guard, session, _) = await GuardGuestAsync(slug, guestSessionId);
        if (guard != RetroActionResult.Ok) return guard;
        var vote = await db.RetroBoardVotes
            .Where(v => v.RetroBoardNoteId == noteId && v.GuestSessionId == guestSessionId && v.Note!.RetroBoardSessionId == session!.Id)
            .OrderByDescending(v => v.CreatedAt)
            .FirstOrDefaultAsync();
        if (vote is null) return RetroActionResult.NotFound;
        db.RetroBoardVotes.Remove(vote);
        await db.SaveChangesAsync();
        Broadcast(session!.Id, "rb_voted", new { sessionId = session.Id, noteId });
        return RetroActionResult.Ok;
    }

    /// <summary>The gate for a guest mutation: the board must exist, allow guests, and the caller must
    /// already be a joined guest participant (named themselves via <see cref="JoinGuestAsync"/>). Open
    /// (non-closed) is required unless <paramref name="blockClosed"/> is false — reflection is submitted
    /// after the retro closes, like members'. Returns the tracked session + the caller's participant row.</summary>
    private async Task<(RetroActionResult result, RetroBoardSession? session, RetroBoardParticipant? me)> GuardGuestAsync(
        string slug, string guestSessionId, bool blockClosed = true)
    {
        var sessionId = await ResolveSessionIdAsync(slug);
        if (sessionId is null) return (RetroActionResult.NotFound, null, null);
        var session = await db.RetroBoardSessions.FindAsync(sessionId.Value);
        if (session is null || !session.AllowGuestJoin) return (RetroActionResult.NotFound, null, null);
        if (blockClosed && session.Status == Status.Closed) return (RetroActionResult.Closed, null, null);
        var me = await db.RetroBoardParticipants
            .FirstOrDefaultAsync(p => p.RetroBoardSessionId == sessionId.Value && p.GuestSessionId == guestSessionId);
        if (me is null) return (RetroActionResult.Forbidden, null, null);   // must join (name yourself) first
        return (RetroActionResult.Ok, session, me);
    }

    /// <summary>Submit (or update) a guest's rating + optional comment for a feedback prompt. Exempt from
    /// the close-lock — guest reflection, like a member's, is collected as the retro wraps up — but the
    /// caller must be a joined guest so the anonymous aggregate can't be poisoned.</summary>
    public async Task<RetroActionResult> RespondGuestFeedbackAsync(string slug, string guestSessionId, Guid promptId, int score, string? comment)
    {
        if (score is < 1 or > 5) return RetroActionResult.Invalid;
        var (guard, session, _) = await GuardGuestAsync(slug, guestSessionId, blockClosed: false);
        if (guard != RetroActionResult.Ok) return guard;
        if (!await db.RetroBoardFeedbackPrompts.AnyAsync(p => p.Id == promptId && p.RetroBoardSessionId == session!.Id))
            return RetroActionResult.NotFound;

        var trimmed = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim();
        var existing = await db.RetroBoardFeedbackResponses
            .FirstOrDefaultAsync(r => r.RetroBoardFeedbackPromptId == promptId && r.GuestSessionId == guestSessionId);
        if (existing is null)
            db.RetroBoardFeedbackResponses.Add(new RetroBoardFeedbackResponse { RetroBoardFeedbackPromptId = promptId, GuestSessionId = guestSessionId, Score = score, Comment = trimmed });
        else { existing.Score = score; existing.Comment = trimmed; existing.UpdatedAt = DateTimeOffset.UtcNow; }
        await db.SaveChangesAsync();
        Broadcast(session!.Id, "rb_feedback_responded", new { sessionId = session.Id, promptId });
        return RetroActionResult.Ok;
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
