using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.RetroBoard;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Application.Services;

// The board surface used during the live retro: columns, notes and votes. All of these are
// blocked once the session is closed (see GuardAsync blockClosed).
public partial class RetroBoardService
{
    // ---------- Columns (setup) ----------

    public async Task<(RetroActionResult result, RetroBoardColumnDto? value)> AddColumnAsync(Guid sessionId, Guid memberId, RetroColumnInput input)
    {
        var (guard, _) = await GuardAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: true);
        if (guard != RetroActionResult.Ok) return (guard, null);
        var order = (await db.RetroBoardColumns.Where(c => c.RetroBoardSessionId == sessionId).MaxAsync(c => (int?)c.SortOrder) ?? -1) + 1;
        var col = new RetroBoardColumn
        {
            RetroBoardSessionId = sessionId,
            Key = string.IsNullOrWhiteSpace(input.Key) ? $"col{order}" : input.Key.Trim(),
            Label = input.Label.Trim(), Description = input.Description, Color = input.Color, Icon = input.Icon, SortOrder = order,
        };
        db.RetroBoardColumns.Add(col);
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_columns_changed");
        return (RetroActionResult.Ok, new RetroBoardColumnDto { Id = col.Id, Key = col.Key, Label = col.Label, Description = col.Description, Color = col.Color, Icon = col.Icon, SortOrder = col.SortOrder });
    }

    public async Task<RetroActionResult> UpdateColumnAsync(Guid sessionId, Guid memberId, Guid columnId, RetroColumnInput input)
    {
        var (guard, _) = await GuardAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: true);
        if (guard != RetroActionResult.Ok) return guard;
        var col = await db.RetroBoardColumns.FirstOrDefaultAsync(c => c.Id == columnId && c.RetroBoardSessionId == sessionId);
        if (col is null) return RetroActionResult.NotFound;
        col.Label = input.Label.Trim(); col.Description = input.Description; col.Color = input.Color; col.Icon = input.Icon;
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_columns_changed");
        return RetroActionResult.Ok;
    }

    public async Task<RetroActionResult> DeleteColumnAsync(Guid sessionId, Guid memberId, Guid columnId)
    {
        var (guard, _) = await GuardAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: true);
        if (guard != RetroActionResult.Ok) return guard;
        var col = await db.RetroBoardColumns.Include(c => c.Notes).FirstOrDefaultAsync(c => c.Id == columnId && c.RetroBoardSessionId == sessionId);
        if (col is null) return RetroActionResult.NotFound;
        if (col.Notes.Count > 0) db.RetroBoardNotes.RemoveRange(col.Notes);   // Restrict FK -- clear notes first
        db.RetroBoardColumns.Remove(col);
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_columns_changed");
        return RetroActionResult.Ok;
    }

    /// <summary>Replaces the whole column set from a template (Setup convenience). Draft-only so there
    /// are never notes to orphan; writes the same RetroBoardColumn fields manual editing does.</summary>
    public async Task<(RetroActionResult result, RetroBoardSessionDto? session)> SetColumnsAsync(Guid sessionId, Guid memberId, List<RetroColumnInput> inputs)
    {
        var (guard, session) = await GuardAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: true);
        if (guard != RetroActionResult.Ok) return (guard, null);
        if (session!.Status != RetroBoardConstants.Status.Draft) return (RetroActionResult.Conflict, null);
        if (inputs.Count == 0) return (RetroActionResult.Invalid, null);

        var existing = await db.RetroBoardColumns.Where(c => c.RetroBoardSessionId == sessionId).ToListAsync();
        db.RetroBoardColumns.RemoveRange(existing);
        db.RetroBoardColumns.AddRange(inputs.Select((c, i) => new RetroBoardColumn
        {
            RetroBoardSessionId = sessionId,
            Key = string.IsNullOrWhiteSpace(c.Key) ? $"col{i}" : c.Key.Trim(),
            Label = c.Label.Trim(), Description = c.Description, Color = c.Color, Icon = c.Icon, SortOrder = i,
        }));
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_columns_changed");
        return (RetroActionResult.Ok, await GetSessionAsync(sessionId, memberId));
    }

    // ---------- Notes ----------

    public async Task<(RetroActionResult result, RetroBoardSessionDto? session, string? error)> AddNoteAsync(Guid sessionId, Guid memberId, AddRetroBoardNoteRequest req)
    {
        var (guard, access) = await GuardAccessAsync(sessionId, memberId, facilitatorOnly: false, blockClosed: true);
        if (guard != RetroActionResult.Ok) return (guard, null, null);
        var session = access!.Session;
        // Facilitators may still capture something said mid-discussion; everyone else is held to Capture.
        if (!CanAddNotes(session) && !access.IsFacilitator) return (RetroActionResult.Conflict, null, NotesClosedError);
        if (string.IsNullOrWhiteSpace(req.Text)) return (RetroActionResult.Invalid, null, null);
        var columnOk = await db.RetroBoardColumns.AnyAsync(c => c.Id == req.ColumnId && c.RetroBoardSessionId == sessionId);
        if (!columnOk) return (RetroActionResult.NotFound, null, null);

        var anon = req.IsAnonymous && session.AllowAnonymous;
        db.RetroBoardNotes.Add(new RetroBoardNote
        {
            RetroBoardSessionId = sessionId,
            RetroBoardColumnId = req.ColumnId,
            AuthorMemberId = anon ? null : memberId,   // authorship isn't stored for anonymous notes
            IsAnonymous = anon,
            Text = req.Text.Trim(),
        });
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_note_added", new { sessionId });
        return (RetroActionResult.Ok, await GetSessionAsync(sessionId, memberId), null);
    }

    public async Task<RetroActionResult> UpdateNoteTextAsync(Guid sessionId, Guid memberId, Guid noteId, string text)
    {
        var (guard, _) = await GuardAsync(sessionId, memberId, facilitatorOnly: false, blockClosed: true);
        if (guard != RetroActionResult.Ok) return guard;
        if (string.IsNullOrWhiteSpace(text)) return RetroActionResult.Invalid;
        var note = await db.RetroBoardNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.RetroBoardSessionId == sessionId);
        if (note is null) return RetroActionResult.NotFound;
        if (!await CanEditNoteAsync(sessionId, memberId, note)) return RetroActionResult.Forbidden;
        note.Text = text.Trim();
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_note_updated", new { sessionId, noteId });
        return RetroActionResult.Ok;
    }

    public async Task<(RetroActionResult result, string? error)> DeleteNoteAsync(Guid sessionId, Guid memberId, Guid noteId)
    {
        var (guard, access) = await GuardAccessAsync(sessionId, memberId, facilitatorOnly: false, blockClosed: true);
        if (guard != RetroActionResult.Ok) return (guard, null);
        var note = await db.RetroBoardNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.RetroBoardSessionId == sessionId);
        if (note is null) return (RetroActionResult.NotFound, null);
        if (!await CanEditNoteAsync(sessionId, memberId, note)) return (RetroActionResult.Forbidden, null);
        // An author can retract a note while the board is still capturing; a facilitator can clear one
        // at any point (they're moderating, not contributing).
        if (!CanAddNotes(access!.Session) && !access.IsFacilitator) return (RetroActionResult.Conflict, NotesClosedError);
        // Keep the group valid: deleting its anchor promotes a survivor, and a group of one dissolves.
        await ReseatGroupAfterDeleteAsync(note);
        db.RetroBoardNotes.Remove(note);
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_note_deleted", new { sessionId, noteId });
        return (RetroActionResult.Ok, null);
    }

    public async Task<RetroActionResult> FlagNoteAsync(Guid sessionId, Guid memberId, Guid noteId, bool flagged)
    {
        // Any enrolled participant may flag a note for discussion.
        var (guard, _) = await GuardAsync(sessionId, memberId, facilitatorOnly: false, blockClosed: true);
        if (guard != RetroActionResult.Ok) return guard;
        var note = await db.RetroBoardNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.RetroBoardSessionId == sessionId);
        if (note is null) return RetroActionResult.NotFound;
        note.Flagged = flagged;
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_note_updated", new { sessionId, noteId });
        return RetroActionResult.Ok;
    }

    public async Task<RetroActionResult> ClarifyNoteAsync(Guid sessionId, Guid memberId, Guid noteId, string? clarification)
    {
        var (guard, _) = await GuardAsync(sessionId, memberId, facilitatorOnly: false, blockClosed: true);
        if (guard != RetroActionResult.Ok) return guard;
        var note = await db.RetroBoardNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.RetroBoardSessionId == sessionId);
        if (note is null) return RetroActionResult.NotFound;
        if (!await CanEditNoteAsync(sessionId, memberId, note)) return RetroActionResult.Forbidden;
        note.Clarification = string.IsNullOrWhiteSpace(clarification) ? null : clarification.Trim();
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_note_updated", new { sessionId, noteId });
        return RetroActionResult.Ok;
    }

    public async Task<RetroActionResult> SetIntroducedAsync(Guid sessionId, Guid memberId, Guid noteId, bool introduced)
    {
        var (guard, _) = await GuardAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: true);
        if (guard != RetroActionResult.Ok) return guard;
        var note = await db.RetroBoardNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.RetroBoardSessionId == sessionId);
        if (note is null) return RetroActionResult.NotFound;
        note.IntroducedAt = introduced ? DateTimeOffset.UtcNow : null;
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_note_updated", new { sessionId, noteId });
        return RetroActionResult.Ok;
    }

    // ---------- Votes ----------

    public async Task<(RetroActionResult result, string? error)> AddVoteAsync(Guid sessionId, Guid memberId, Guid noteId)
    {
        var (guard, session) = await GuardAsync(sessionId, memberId, facilitatorOnly: false, blockClosed: true);
        if (guard != RetroActionResult.Ok) return (guard, guard == RetroActionResult.Closed ? "This retro is closed." : null);
        if (!CanVote(session!)) return (RetroActionResult.Conflict, VotingClosedError);
        var note = await db.RetroBoardNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.RetroBoardSessionId == sessionId);
        if (note is null) return (RetroActionResult.NotFound, "Note not found.");

        var used = await db.RetroBoardVotes.CountAsync(v => v.Note!.RetroBoardSessionId == sessionId && v.MemberId == memberId);
        if (used >= session!.VotesPerUser) return (RetroActionResult.Conflict, "No votes left.");

        // A group is ONE topic: the vote lands on the anchor and the per-topic cap counts every vote
        // the member has on any note in the group — otherwise merging three wordings of an idea would
        // hand everyone 9 votes on it instead of 3.
        var target = VoteTargetOf(note);
        var onThisTopic = await CountVotesOnTopicAsync(sessionId, target, memberId, null);
        if (onThisTopic >= MaxVotesPerTopic) return (RetroActionResult.Conflict, $"Max {MaxVotesPerTopic} votes per topic.");

        db.RetroBoardVotes.Add(new RetroBoardVote { RetroBoardNoteId = target, MemberId = memberId });
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_voted", new { sessionId, noteId = target });
        return (RetroActionResult.Ok, null);
    }

    public async Task<(RetroActionResult result, string? error)> RemoveVoteAsync(Guid sessionId, Guid memberId, Guid noteId)
    {
        var (guard, session) = await GuardAsync(sessionId, memberId, facilitatorOnly: false, blockClosed: true);
        if (guard != RetroActionResult.Ok) return (guard, null);
        if (!CanVote(session!)) return (RetroActionResult.Conflict, VotingClosedError);
        var note = await db.RetroBoardNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.RetroBoardSessionId == sessionId);
        if (note is null) return (RetroActionResult.NotFound, null);
        // Take back the newest vote anywhere in the topic, so a member can undo a vote they cast on a
        // note before it was merged into this group.
        var groupIds = await TopicNoteIdsAsync(sessionId, VoteTargetOf(note));
        var vote = await db.RetroBoardVotes
            .Where(v => groupIds.Contains(v.RetroBoardNoteId) && v.MemberId == memberId && v.Note!.RetroBoardSessionId == sessionId)
            .OrderByDescending(v => v.CreatedAt)
            .FirstOrDefaultAsync();
        if (vote is null) return (RetroActionResult.NotFound, null);
        db.RetroBoardVotes.Remove(vote);
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_voted", new { sessionId, noteId });
        return (RetroActionResult.Ok, null);
    }

    // ---------- Note comments ----------

    /// <summary>Add a comment to a note. Any enrolled participant may comment, on any note — the point
    /// is asking the author for context rather than posting a second sticky to explain the first. Never
    /// anonymous, even on an anonymous note (the note's author stays hidden; the commenter doesn't).</summary>
    public async Task<(RetroActionResult result, RetroBoardNoteCommentDto? value, string? error)> AddNoteCommentAsync(
        Guid sessionId, Guid memberId, Guid noteId, string text)
    {
        var (guard, access) = await GuardAccessAsync(sessionId, memberId, facilitatorOnly: false, blockClosed: true);
        if (guard != RetroActionResult.Ok) return (guard, null, null);
        if (!CanComment(access!.Session) && !access.IsFacilitator) return (RetroActionResult.Conflict, null, CommentsClosedError);
        var trimmed = text?.Trim();
        if (string.IsNullOrEmpty(trimmed)) return (RetroActionResult.Invalid, null, null);
        if (trimmed.Length > MaxCommentLength) trimmed = trimmed[..MaxCommentLength];

        var note = await db.RetroBoardNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.RetroBoardSessionId == sessionId);
        if (note is null) return (RetroActionResult.NotFound, null, null);
        // Don't let a comment land on a note the caller can't even see yet — it would leak that the
        // note exists, and the comment would surface the moment the facilitator reveals.
        if (IsNoteHiddenFrom(access.Session, note, note.AuthorMemberId == memberId, access.IsFacilitator))
            return (RetroActionResult.Forbidden, null, null);

        var comment = new RetroBoardNoteComment { RetroBoardNoteId = noteId, AuthorMemberId = memberId, Text = trimmed };
        db.RetroBoardNoteComments.Add(comment);
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_note_updated", new { sessionId, noteId });

        var author = await db.TeamMembers.AsNoTracking().FirstOrDefaultAsync(m => m.Id == memberId);
        return (RetroActionResult.Ok, new RetroBoardNoteCommentDto
        {
            Id = comment.Id, NoteId = noteId, AuthorId = memberId,
            AuthorName = author is null ? "" : $"{author.FirstName} {author.LastName}".Trim(),
            IsOwn = true, Text = comment.Text, CreatedAt = comment.CreatedAt,
        }, null);
    }

    /// <summary>Delete a comment — its author, or any facilitator moderating the board.</summary>
    public async Task<(RetroActionResult result, string? error)> DeleteNoteCommentAsync(Guid sessionId, Guid memberId, Guid commentId)
    {
        var (guard, access) = await GuardAccessAsync(sessionId, memberId, facilitatorOnly: false, blockClosed: true);
        if (guard != RetroActionResult.Ok) return (guard, null);
        var comment = await db.RetroBoardNoteComments
            .FirstOrDefaultAsync(c => c.Id == commentId && c.Note!.RetroBoardSessionId == sessionId);
        if (comment is null) return (RetroActionResult.NotFound, null);
        if (comment.AuthorMemberId != memberId && !access!.IsFacilitator) return (RetroActionResult.Forbidden, null);
        db.RetroBoardNoteComments.Remove(comment);
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_note_updated", new { sessionId, noteId = comment.RetroBoardNoteId });
        return (RetroActionResult.Ok, null);
    }
}
