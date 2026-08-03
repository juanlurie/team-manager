using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.RetroBoard;
using TeamManager.Api.Domain.Entities;
using static TeamManager.Api.Domain.Entities.RetroBoardConstants;

namespace TeamManager.Api.Application.Services;

/// <summary>
/// Merging near-duplicate notes into one topic, so the team votes on the idea rather than splitting
/// its vote across three wordings of it — by hand (drag one note onto another) or in bulk from the AI.
///
/// <para><b>Shape.</b> A group is the set of notes sharing a <c>GroupId</c>, which is the id of the
/// group's <b>anchor</b> — the one note that points at itself (<c>GroupId == Id</c>). That's the same
/// mechanic FunRetro's drag-to-stack uses, deliberately: one concept across both retro surfaces.</para>
///
/// <para><b>Invariants</b>, all maintained here rather than assumed by callers:
/// <list type="bullet">
/// <item>A group never spans columns — the columns are the themes.</item>
/// <item>A group never has fewer than two notes; it dissolves instead.</item>
/// <item>The anchor is always a member of its own group. If the anchor leaves, the oldest remaining
/// member is promoted and carries the label, so the group survives losing its first note.</item>
/// </list></para>
///
/// <para><b>Votes.</b> A group is one votable unit — see <c>AddVoteAsync</c>, which redirects a vote
/// on any member to the anchor and applies the per-topic cap across the whole group. Grouping
/// therefore never destroys votes already cast: they stay on the note they were cast on and the
/// group's total is their sum.</para>
/// </summary>
public partial class RetroBoardService
{
    /// <summary>Longest group label we store; anything longer is truncated, not rejected.</summary>
    public const int MaxGroupLabelLength = 120;

    /// <summary>Drag <paramref name="noteId"/> onto <paramref name="targetNoteId"/>. If the target is
    /// loose it becomes the anchor of a new group; if it's already grouped, the note joins that group.
    /// Dragging a whole group onto another merges them.</summary>
    public async Task<(RetroActionResult result, string? error)> GroupNoteAsync(
        Guid sessionId, Guid memberId, Guid noteId, Guid targetNoteId)
    {
        var (guard, access) = await GuardAccessAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: true);
        if (guard != RetroActionResult.Ok) return (guard, null);
        if (!CanGroup(access!.Session)) return (RetroActionResult.Conflict, GroupingClosedError);
        if (noteId == targetNoteId) return (RetroActionResult.Invalid, null);

        var notes = await db.RetroBoardNotes.Where(n => n.RetroBoardSessionId == sessionId).ToListAsync();
        var note = notes.FirstOrDefault(n => n.Id == noteId);
        var target = notes.FirstOrDefault(n => n.Id == targetNoteId);
        if (note is null || target is null) return (RetroActionResult.NotFound, null);
        if (note.RetroBoardColumnId != target.RetroBoardColumnId)
            return (RetroActionResult.Conflict, "Notes can only be grouped within the same column.");

        // Already together — nothing to do, and treating it as an error would make a stray drop noisy.
        if (note.GroupId is Guid g && g == (target.GroupId ?? target.Id)) return (RetroActionResult.Ok, null);
        // Dropping a group's anchor onto one of its own members would orphan the group into itself.
        if (target.GroupId == note.Id) return (RetroActionResult.Invalid, null);

        // The target's group, creating one (with the target as anchor) if it's currently loose.
        var anchorId = target.GroupId ?? target.Id;
        target.GroupId = anchorId;

        // Move the dragged note — and everything grouped with it, so dragging a stack merges stacks.
        var moving = notes.Where(n => n.Id == noteId || (note.GroupId is Guid ng && n.GroupId == ng)).ToList();
        foreach (var m in moving)
        {
            m.GroupId = anchorId;
            m.GroupLabel = null;          // only the surviving anchor keeps a label
        }

        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_notes_grouped", new { sessionId, anchorId });
        return (RetroActionResult.Ok, null);
    }

    /// <summary>Break a whole group apart; every member becomes a standalone note again.</summary>
    public async Task<(RetroActionResult result, string? error)> UngroupAsync(Guid sessionId, Guid memberId, Guid anchorId)
    {
        var (guard, access) = await GuardAccessAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: true);
        if (guard != RetroActionResult.Ok) return (guard, null);
        if (!CanGroup(access!.Session)) return (RetroActionResult.Conflict, GroupingClosedError);

        var members = await db.RetroBoardNotes
            .Where(n => n.RetroBoardSessionId == sessionId && n.GroupId == anchorId)
            .ToListAsync();
        if (members.Count == 0) return (RetroActionResult.NotFound, null);
        foreach (var m in members) { m.GroupId = null; m.GroupLabel = null; }

        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_notes_grouped", new { sessionId, anchorId });
        return (RetroActionResult.Ok, null);
    }

    /// <summary>Pull a single note out of its group, leaving the rest intact.</summary>
    public async Task<(RetroActionResult result, string? error)> UngroupNoteAsync(Guid sessionId, Guid memberId, Guid noteId)
    {
        var (guard, access) = await GuardAccessAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: true);
        if (guard != RetroActionResult.Ok) return (guard, null);
        if (!CanGroup(access!.Session)) return (RetroActionResult.Conflict, GroupingClosedError);

        var note = await db.RetroBoardNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.RetroBoardSessionId == sessionId);
        if (note is null) return (RetroActionResult.NotFound, null);
        if (note.GroupId is not Guid anchorId) return (RetroActionResult.Ok, null);   // already loose

        var siblings = await db.RetroBoardNotes
            .Where(n => n.RetroBoardSessionId == sessionId && n.GroupId == anchorId && n.Id != noteId)
            .OrderBy(n => n.CreatedAt)
            .ToListAsync();

        var label = note.GroupLabel;
        note.GroupId = null;
        note.GroupLabel = null;
        ReseatGroup(siblings, anchorId, label);

        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_notes_grouped", new { sessionId, anchorId });
        return (RetroActionResult.Ok, null);
    }

    /// <summary>Rename a group. Null/blank clears the label back to the default "N notes" heading.</summary>
    public async Task<(RetroActionResult result, string? error)> SetGroupLabelAsync(
        Guid sessionId, Guid memberId, Guid anchorId, string? label)
    {
        var (guard, access) = await GuardAccessAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: true);
        if (guard != RetroActionResult.Ok) return (guard, null);
        if (!CanGroup(access!.Session)) return (RetroActionResult.Conflict, GroupingClosedError);

        var anchor = await db.RetroBoardNotes
            .FirstOrDefaultAsync(n => n.Id == anchorId && n.RetroBoardSessionId == sessionId && n.GroupId == anchorId);
        if (anchor is null) return (RetroActionResult.NotFound, null);

        var trimmed = string.IsNullOrWhiteSpace(label) ? null : label.Trim();
        if (trimmed is { Length: > MaxGroupLabelLength }) trimmed = trimmed[..MaxGroupLabelLength];
        anchor.GroupLabel = trimmed;

        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_notes_grouped", new { sessionId, anchorId });
        return (RetroActionResult.Ok, null);
    }

    /// <summary>Ask the AI to cluster near-duplicate notes, then apply the result through the same
    /// anchor mechanic drag-to-stack uses — so it introduces no new concept on the board, exactly as
    /// FunRetro's GroupSimilarCardsAsync does. Reuses that feature's <c>GroupRetroCards</c> prompt, so
    /// an admin configures one prompt for both retro surfaces.</summary>
    public async Task<(RetroActionResult result, string? error, int grouped)> GroupSimilarNotesAsync(Guid sessionId, Guid memberId)
    {
        var (guard, access) = await GuardAccessAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: true);
        if (guard != RetroActionResult.Ok) return (guard, null, 0);
        if (!CanGroup(access!.Session)) return (RetroActionResult.Conflict, GroupingClosedError, 0);

        var notes = await db.RetroBoardNotes
            .Where(n => n.RetroBoardSessionId == sessionId && n.Text != "")
            .ToListAsync();
        if (notes.Count < 2) return (RetroActionResult.Conflict, "Need at least two notes to group.", 0);

        var columnKeys = await db.RetroBoardColumns
            .Where(c => c.RetroBoardSessionId == sessionId)
            .ToDictionaryAsync(c => c.Id, c => c.Key);

        // "id|column|text" per line — cheap for the model to read, and it hands ids straight back
        // rather than us fuzzy-matching text in the response.
        var noteList = string.Join("\n", notes.Select(n => $"{n.Id}|{columnKeys.GetValueOrDefault(n.RetroBoardColumnId, "")}|{n.Text}"));

        var raw = await aiExecutor.ExecuteAsync(
            "GroupRetroCards", new Dictionary<string, string> { ["cards"] = noteList },
            "RetroBoardSession", $"Note grouping for retro {sessionId}", sessionId.ToString());
        if (raw is null)
            return (RetroActionResult.Conflict, "AI grouping unavailable — configure a GroupRetroCards prompt to enable this.", 0);

        List<RetroBoardGroupSuggestion>? suggestions;
        try { suggestions = JsonSerializer.Deserialize<List<RetroBoardGroupSuggestion>>(raw, JsonRead); }
        catch { return (RetroActionResult.Conflict, "AI returned an unexpected format.", 0); }
        if (suggestions is null || suggestions.Count == 0)
            return (RetroActionResult.Conflict, "AI found no similar notes to group.", 0);

        var byId = notes.ToDictionary(n => n.Id);
        var grouped = 0;
        foreach (var s in suggestions)
        {
            // Drop hallucinated/stale ids, anything already grouped by hand (the facilitator's own
            // grouping wins over a suggestion), and — since a group never spans columns — keep only
            // the largest same-column run of what's left. A "group" of one isn't a group.
            var candidates = s.NoteIds.Where(byId.ContainsKey).Distinct().Select(id => byId[id])
                .Where(n => n.GroupId is null).ToList();
            var cluster = candidates
                .GroupBy(n => n.RetroBoardColumnId)
                .OrderByDescending(g => g.Count())
                .FirstOrDefault()?.ToList() ?? [];
            if (cluster.Count < 2) continue;

            var anchor = cluster[0];
            foreach (var n in cluster) { n.GroupId = anchor.Id; n.GroupLabel = null; }
            anchor.GroupLabel = string.IsNullOrWhiteSpace(s.Label) ? null : s.Label.Trim();
            if (anchor.GroupLabel is { Length: > MaxGroupLabelLength }) anchor.GroupLabel = anchor.GroupLabel[..MaxGroupLabelLength];
            grouped += cluster.Count;
        }

        if (grouped == 0) return (RetroActionResult.Conflict, "AI didn't suggest any valid groups.", 0);

        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_notes_grouped", new { sessionId });
        return (RetroActionResult.Ok, null, grouped);
    }

    // ---------- Invariants ----------

    /// <summary>Re-seats a group after a member (possibly the anchor) left: dissolves it if fewer than
    /// two notes remain, and otherwise makes sure an anchor still exists — promoting the oldest member
    /// and handing it the label when the previous anchor is the one that left.
    /// <paramref name="remaining"/> must be ordered oldest-first and already exclude the departed note.</summary>
    private static void ReseatGroup(List<RetroBoardNote> remaining, Guid anchorId, string? label)
    {
        if (remaining.Count < 2)
        {
            foreach (var n in remaining) { n.GroupId = null; n.GroupLabel = null; }
            return;
        }
        if (remaining.Any(n => n.Id == anchorId)) return;      // the anchor stayed; nothing to do

        var promoted = remaining[0];
        foreach (var n in remaining) { n.GroupId = promoted.Id; n.GroupLabel = null; }
        promoted.GroupLabel = label;
    }

    /// <summary>Keeps the group valid when a note is deleted outright (see DeleteNoteAsync). Loads the
    /// survivors itself because the caller only has the note that's going.</summary>
    private async Task ReseatGroupAfterDeleteAsync(RetroBoardNote deleted)
    {
        if (deleted.GroupId is not Guid anchorId) return;
        var remaining = await db.RetroBoardNotes
            .Where(n => n.RetroBoardSessionId == deleted.RetroBoardSessionId && n.GroupId == anchorId && n.Id != deleted.Id)
            .OrderBy(n => n.CreatedAt)
            .ToListAsync();
        ReseatGroup(remaining, anchorId, deleted.GroupLabel);
    }

    /// <summary>The votable unit a note belongs to: its group's anchor, or itself when it's loose.
    /// Voting, and the per-topic cap, are both expressed against this.</summary>
    private static Guid VoteTargetOf(RetroBoardNote note) => note.GroupId ?? note.Id;

    /// <summary>Every note that makes up one votable topic — the whole group, or just the note itself
    /// when it's loose. Votes cast before a merge live on the note they were cast on, so both the cap
    /// and the totals have to look across all of them.</summary>
    private async Task<List<Guid>> TopicNoteIdsAsync(Guid sessionId, Guid anchorId)
    {
        var members = await db.RetroBoardNotes
            .Where(n => n.RetroBoardSessionId == sessionId && n.GroupId == anchorId)
            .Select(n => n.Id)
            .ToListAsync();
        return members.Count > 0 ? members : [anchorId];
    }

    /// <summary>How many votes one voter has spent on a topic. Exactly one of
    /// <paramref name="memberId"/> / <paramref name="guestSessionId"/> identifies them.</summary>
    private async Task<int> CountVotesOnTopicAsync(Guid sessionId, Guid anchorId, Guid? memberId, string? guestSessionId)
    {
        var ids = await TopicNoteIdsAsync(sessionId, anchorId);
        return await db.RetroBoardVotes.CountAsync(v =>
            ids.Contains(v.RetroBoardNoteId)
            && (memberId != null ? v.MemberId == memberId : v.GuestSessionId == guestSessionId));
    }
}

/// <summary>One AI-suggested cluster. Mirrors FunRetro's suggestion shape; `cardIds` is the wire name
/// because both surfaces share the GroupRetroCards prompt, which speaks in "cards".</summary>
public record RetroBoardGroupSuggestion
{
    [System.Text.Json.Serialization.JsonPropertyName("cardIds")]
    public List<Guid> NoteIds { get; init; } = [];
    public string? Label { get; init; }
}
