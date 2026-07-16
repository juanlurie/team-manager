using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.RetroBoard;
using TeamManager.Api.Domain.Entities;
using static TeamManager.Api.Domain.Entities.RetroBoardConstants;

namespace TeamManager.Api.Application.Services;

// Session lifecycle: create/join/delete, phase advance, and the close/reopen/archive transitions
// plus the AI Reflect synthesis.
public partial class RetroBoardService
{
    public async Task<RetroBoardSessionDto> CreateSessionAsync(Guid memberId, CreateRetroBoardSessionRequest req)
    {
        var member = await db.TeamMembers.FindAsync(memberId)
            ?? throw new InvalidOperationException("Member not found.");

        var session = new RetroBoardSession
        {
            Title = string.IsNullOrWhiteSpace(req.Title) ? $"Retro — {DateTimeOffset.Now:MMM d, yyyy}" : req.Title.Trim(),
            SquadId = req.SquadId,
            SprintId = req.SprintId,
            CreatedByMemberId = memberId,
            Phase = Phase.Setup,
            Status = Status.Draft,
            VotesPerUser = req.VotesPerUser is > 0 and <= 99 ? req.VotesPerUser.Value : 6,
            AllowAnonymous = req.AllowAnonymous ?? true,
            HideNotesUntilReveal = req.HideNotesUntilReveal ?? true,
            StepDurationsJson = JsonSerializer.Serialize(req.StepDurations ?? new RetroStepDurations(), Json),
            Slug = await GenerateUniqueSlugAsync(),
        };

        // Columns: explicit, else the default four.
        var cols = (req.Columns is { Count: > 0 } ? req.Columns.Select((c, i) => new RetroBoardColumn
        {
            Key = string.IsNullOrWhiteSpace(c.Key) ? $"col{i}" : c.Key.Trim(),
            Label = c.Label.Trim(), Description = c.Description, Color = c.Color, Icon = c.Icon, SortOrder = i,
        }) : DefaultColumns()).ToList();
        session.Columns = cols;

        // Check-in questions: explicit, else carried forward from the squad's last closed retro.
        if (req.CheckinQuestions is { Count: > 0 })
        {
            session.CheckinQuestions = req.CheckinQuestions.Select((q, i) => new RetroBoardCheckinQuestion
            {
                Text = q.Text.Trim(), ContextText = q.ContextText, SortOrder = i,
            }).ToList();
        }
        else if (req.SeedFromPreviousRetro && req.SquadId is { } squadId)
        {
            session.CheckinQuestions = await SeedCheckinFromPreviousAsync(squadId);
        }

        // Feedback prompts: explicit list, else a sensible default set.
        session.FeedbackPrompts = (req.FeedbackPrompts is { Count: > 0 }
            ? req.FeedbackPrompts.Where(p => !string.IsNullOrWhiteSpace(p.Text)).Select((p, i) => new RetroBoardFeedbackPrompt { Text = p.Text.Trim(), SortOrder = i })
            : DefaultFeedbackPrompts()).ToList();

        // Creator joins as the first facilitator.
        session.Participants = [new RetroBoardParticipant { MemberId = memberId, Role = Role.Facilitator }];

        db.RetroBoardSessions.Add(session);
        await db.SaveChangesAsync();

        return (await GetSessionAsync(session.Id, memberId))!;
    }

    public async Task<RetroBoardSessionDto?> JoinAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.RetroBoardSessions.FindAsync(sessionId);
        if (session is null) return null;

        // Closed sessions are view-only: return current state without enrolling anyone new,
        // so facilitators can review the recap/feedback and choose to reopen.
        if (session.Status != Status.Closed)
        {
            var existing = await db.RetroBoardParticipants
                .FirstOrDefaultAsync(p => p.RetroBoardSessionId == sessionId && p.MemberId == memberId);
            if (existing is null)
            {
                var role = session.CreatedByMemberId == memberId ? Role.Facilitator : Role.Participant;
                db.RetroBoardParticipants.Add(new RetroBoardParticipant { RetroBoardSessionId = sessionId, MemberId = memberId, Role = role });
                await db.SaveChangesAsync();
                Broadcast(sessionId, "rb_participant_changed");
            }
            else
            {
                existing.LastSeenAt = DateTimeOffset.UtcNow;
                await db.SaveChangesAsync();
            }
        }
        return await GetSessionAsync(sessionId, memberId);
    }

    public async Task<bool> DeleteSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.RetroBoardSessions.FindAsync(sessionId);
        if (session is null || session.CreatedByMemberId != memberId) return false;   // creator-only; 404 hides existence
        db.RetroBoardSessions.Remove(session);
        await db.SaveChangesAsync();
        broadcaster.Global("rb_session_deleted", new { sessionId }, guestAllowed: true);
        return true;
    }

    /// <summary>Publishes a draft session for asynchronous pre-capture (draft → open). Members can add
    /// notes on the Capture board before the facilitator starts the synced flow via <see cref="GoLiveAsync"/>.</summary>
    public async Task<(RetroActionResult result, RetroBoardSessionDto? session)> OpenAsync(Guid sessionId, Guid memberId)
    {
        var (guard, session) = await GuardAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: true);
        if (guard != RetroActionResult.Ok) return (guard, null);
        session!.Status = Status.Open;
        session.Phase = Phase.Capture;   // pre-capture happens on the Capture board
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_lifecycle_changed", new { sessionId });
        return (RetroActionResult.Ok, await GetSessionAsync(sessionId, memberId));
    }

    /// <summary>Starts the synced, guided session (open → live). Begins at Check-in — the top of the
    /// flow — so the meeting opens properly; any notes added during pre-capture are still present when
    /// the flow reaches Capture.</summary>
    public async Task<(RetroActionResult result, RetroBoardSessionDto? session)> GoLiveAsync(Guid sessionId, Guid memberId)
    {
        var (guard, session) = await GuardAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: true);
        if (guard != RetroActionResult.Ok) return (guard, null);
        session!.Status = Status.Live;
        session.StartedAt ??= DateTimeOffset.UtcNow;
        // Start at the first phase active this run (skips a disabled or empty check-in).
        var hasCheckin = await db.RetroBoardCheckinQuestions.AnyAsync(q => q.RetroBoardSessionId == sessionId);
        var hasReflect = await db.RetroBoardFeedbackPrompts.AnyAsync(p => p.RetroBoardSessionId == sessionId);
        var start = EnabledPhases(ParsePhaseConfig(session.PhaseConfigJson), hasCheckin, hasReflect).FirstOrDefault() ?? Phase.Capture;
        session.Phase = start;
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_phase_changed", new { sessionId, phase = start });
        Broadcast(sessionId, "rb_lifecycle_changed", new { sessionId });
        return (RetroActionResult.Ok, await GetSessionAsync(sessionId, memberId));
    }

    public async Task<(RetroActionResult result, RetroBoardSessionDto? session)> SetPhaseAsync(Guid sessionId, Guid memberId, string phase)
    {
        if (!Phase.Order.Contains(phase)) return (RetroActionResult.Invalid, null);
        var (guard, session) = await GuardAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: true);
        if (guard != RetroActionResult.Ok) return (guard, null);

        // Can only navigate to a phase active this run (config-disabled/auto-skipped phases are rejected).
        var hasCheckin = await db.RetroBoardCheckinQuestions.AnyAsync(q => q.RetroBoardSessionId == sessionId);
        var hasReflect = await db.RetroBoardFeedbackPrompts.AnyAsync(p => p.RetroBoardSessionId == sessionId);
        if (!EnabledPhases(ParsePhaseConfig(session!.PhaseConfigJson), hasCheckin, hasReflect).Contains(phase))
            return (RetroActionResult.Invalid, null);

        // Step navigation within a running session. The draft→open→live transitions are owned by
        // OpenAsync/GoLiveAsync; reaching Summary no longer auto-closes (facilitator ends via Close).
        session.Phase = phase;
        await db.SaveChangesAsync();

        Broadcast(sessionId, "rb_phase_changed", new { sessionId, phase });
        return (RetroActionResult.Ok, await GetSessionAsync(sessionId, memberId));
    }

    /// <summary>Sets the session's owning squad and additively enrols that squad's members as
    /// participants (idempotent — existing participants and the creator/facilitator are untouched,
    /// and nobody is ever removed, even when the team changes).</summary>
    public async Task<(RetroActionResult result, RetroBoardSessionDto? session)> SetSquadAsync(Guid sessionId, Guid memberId, Guid? squadId)
    {
        var (guard, session) = await GuardAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: true);
        if (guard != RetroActionResult.Ok) return (guard, null);

        session!.SquadId = squadId;

        if (squadId is { } sid)
        {
            var squadMemberIds = await db.SquadMembers
                .Where(sm => sm.SquadId == sid)
                .Select(sm => sm.TeamMemberId)
                .ToListAsync();
            var already = await db.RetroBoardParticipants
                .Where(p => p.RetroBoardSessionId == sessionId)
                .Select(p => p.MemberId)
                .ToListAsync();
            foreach (var newMemberId in squadMemberIds.Except(already))
                db.RetroBoardParticipants.Add(new RetroBoardParticipant { RetroBoardSessionId = sessionId, MemberId = newMemberId, Role = Role.Participant });
        }

        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_participant_changed");
        return (RetroActionResult.Ok, await GetSessionAsync(sessionId, memberId));
    }

    /// <summary>Facilitator ends the retro. Sets status closed without changing the phase, so a
    /// subsequent reopen returns everyone exactly where they were.</summary>
    public async Task<(RetroActionResult result, RetroBoardSessionDto? session)> CloseAsync(Guid sessionId, Guid memberId)
    {
        var (guard, session) = await GuardAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: false);
        if (guard != RetroActionResult.Ok) return (guard, null);
        session!.Status = Status.Closed;
        session.ClosedAt ??= DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_lifecycle_changed", new { sessionId });
        return (RetroActionResult.Ok, await GetSessionAsync(sessionId, memberId));
    }

    /// <summary>Facilitator reopens a closed session (also un-archives it). Returns to live if it had
    /// started, otherwise back to draft.</summary>
    public async Task<(RetroActionResult result, RetroBoardSessionDto? session)> ReopenAsync(Guid sessionId, Guid memberId)
    {
        var (guard, session) = await GuardAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: false);
        if (guard != RetroActionResult.Ok) return (guard, null);
        session!.Status = session.StartedAt is null ? Status.Draft : Status.Live;
        session.ClosedAt = null;
        session.IsArchived = false;
        session.ArchivedAt = null;
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_lifecycle_changed", new { sessionId });
        return (RetroActionResult.Ok, await GetSessionAsync(sessionId, memberId));
    }

    /// <summary>Facilitator files a session away (or restores it). Archiving hides it from the active lobby.</summary>
    public async Task<RetroActionResult> SetArchivedAsync(Guid sessionId, Guid memberId, bool archived)
    {
        var (guard, session) = await GuardAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: false);
        if (guard != RetroActionResult.Ok) return guard;
        session!.IsArchived = archived;
        session.ArchivedAt = archived ? DateTimeOffset.UtcNow : null;
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_lifecycle_changed", new { sessionId });
        return RetroActionResult.Ok;
    }

    public async Task<RetroActionResult> UpdateSettingsAsync(Guid sessionId, Guid memberId, UpdateRetroBoardSettingsRequest req)
    {
        var (guard, session) = await GuardAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: true);
        if (guard != RetroActionResult.Ok) return guard;

        if (req.VotesPerUser is > 0 and <= 99) session!.VotesPerUser = req.VotesPerUser.Value;
        if (req.AllowAnonymous is { } anon) session!.AllowAnonymous = anon;
        if (req.HideNotesUntilReveal is { } hide) session!.HideNotesUntilReveal = hide;
        if (req.StepDurations is { } dur) session!.StepDurationsJson = JsonSerializer.Serialize(dur, Json);
        if (req.PhaseConfig is { } cfg) session!.PhaseConfigJson = JsonSerializer.Serialize(cfg, Json);
        await db.SaveChangesAsync();

        Broadcast(sessionId, "rb_settings_updated");
        return RetroActionResult.Ok;
    }

    public async Task<RetroActionResult> RevealNotesAsync(Guid sessionId, Guid memberId, bool revealed = true)
    {
        var (guard, session) = await GuardAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: true);
        if (guard != RetroActionResult.Ok) return guard;
        session!.NotesRevealed = revealed;
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_revealed", new { sessionId, revealed });
        return RetroActionResult.Ok;
    }

    /// <summary>Facilitator-driven transient live state (intro stage, spotlight note id, running clock).</summary>
    public async Task<RetroActionResult> SetLiveStateAsync(Guid sessionId, Guid memberId, string? liveStateJson)
    {
        var (guard, session) = await GuardAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: true);
        if (guard != RetroActionResult.Ok) return guard;
        session!.LiveStateJson = liveStateJson;
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_live_state", new { sessionId, liveStateJson });
        return RetroActionResult.Ok;
    }

    public async Task<(bool ok, string? error, RetroBoardAiSummaryDto? summary)> AnalyseAsync(Guid sessionId, Guid memberId)
    {
        var (guard, _) = await GuardAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: false);
        if (guard == RetroActionResult.NotFound) return (false, "Session not found.", null);
        if (guard != RetroActionResult.Ok) return (false, "Only a facilitator can generate the summary.", null);

        var notes = await db.RetroBoardNotes.AsNoTracking()
            .Include(n => n.Column)
            .Where(n => n.RetroBoardSessionId == sessionId)
            .ToListAsync();
        if (notes.Count == 0) return (false, "No notes to summarise.", null);

        var byColumn = notes
            .GroupBy(n => n.Column?.Label ?? "Notes")
            .ToDictionary(g => g.Key, g => string.Join(" | ", g.Select(n => n.Text)));

        var raw = await aiExecutor.ExecuteAsync(
            "SummariseRetroBoard",
            new Dictionary<string, string> { ["notesByColumn"] = JsonSerializer.Serialize(byColumn, Json) },
            "RetroBoardSession", $"RetroBoard summary for session {sessionId}", sessionId.ToString());

        if (raw is null) return (false, "AI summary unavailable — configure a SummariseRetroBoard prompt to enable this.", null);

        RetroBoardAiSummaryDto? summary;
        try { summary = JsonSerializer.Deserialize<RetroBoardAiSummaryDto>(raw, JsonRead); }
        catch { return (false, "AI returned an unexpected format.", null); }
        if (summary is null) return (false, "AI returned an empty response.", null);

        var session = await db.RetroBoardSessions.FindAsync(sessionId);
        session!.AiSummaryJson = JsonSerializer.Serialize(summary, Json);
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_summary_ready", new { sessionId });
        return (true, null, summary);
    }
}
