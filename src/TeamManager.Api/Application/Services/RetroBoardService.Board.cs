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

    public async Task<(RetroActionResult result, RetroBoardSessionDto? session)> AddNoteAsync(Guid sessionId, Guid memberId, AddRetroBoardNoteRequest req)
    {
        var (guard, session) = await GuardAsync(sessionId, memberId, facilitatorOnly: false, blockClosed: true);
        if (guard != RetroActionResult.Ok) return (guard, null);
        if (string.IsNullOrWhiteSpace(req.Text)) return (RetroActionResult.Invalid, null);
        var columnOk = await db.RetroBoardColumns.AnyAsync(c => c.Id == req.ColumnId && c.RetroBoardSessionId == sessionId);
        if (!columnOk) return (RetroActionResult.NotFound, null);

        var anon = req.IsAnonymous && session!.AllowAnonymous;
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
        return (RetroActionResult.Ok, await GetSessionAsync(sessionId, memberId));
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

    public async Task<RetroActionResult> DeleteNoteAsync(Guid sessionId, Guid memberId, Guid noteId)
    {
        var (guard, _) = await GuardAsync(sessionId, memberId, facilitatorOnly: false, blockClosed: true);
        if (guard != RetroActionResult.Ok) return guard;
        var note = await db.RetroBoardNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.RetroBoardSessionId == sessionId);
        if (note is null) return RetroActionResult.NotFound;
        if (!await CanEditNoteAsync(sessionId, memberId, note)) return RetroActionResult.Forbidden;
        db.RetroBoardNotes.Remove(note);
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_note_deleted", new { sessionId, noteId });
        return RetroActionResult.Ok;
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
        var noteOk = await db.RetroBoardNotes.AnyAsync(n => n.Id == noteId && n.RetroBoardSessionId == sessionId);
        if (!noteOk) return (RetroActionResult.NotFound, "Note not found.");

        var used = await db.RetroBoardVotes.CountAsync(v => v.Note!.RetroBoardSessionId == sessionId && v.MemberId == memberId);
        if (used >= session!.VotesPerUser) return (RetroActionResult.Conflict, "No votes left.");

        var onThisNote = await db.RetroBoardVotes.CountAsync(v => v.RetroBoardNoteId == noteId && v.MemberId == memberId);
        if (onThisNote >= 3) return (RetroActionResult.Conflict, "Max 3 votes per topic.");

        db.RetroBoardVotes.Add(new RetroBoardVote { RetroBoardNoteId = noteId, MemberId = memberId });
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_voted", new { sessionId, noteId });
        return (RetroActionResult.Ok, null);
    }

    public async Task<RetroActionResult> RemoveVoteAsync(Guid sessionId, Guid memberId, Guid noteId)
    {
        var (guard, _) = await GuardAsync(sessionId, memberId, facilitatorOnly: false, blockClosed: true);
        if (guard != RetroActionResult.Ok) return guard;
        var vote = await db.RetroBoardVotes
            .Where(v => v.RetroBoardNoteId == noteId && v.MemberId == memberId && v.Note!.RetroBoardSessionId == sessionId)
            .OrderByDescending(v => v.CreatedAt)
            .FirstOrDefaultAsync();
        if (vote is null) return RetroActionResult.NotFound;
        db.RetroBoardVotes.Remove(vote);
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_voted", new { sessionId, noteId });
        return RetroActionResult.Ok;
    }
}
