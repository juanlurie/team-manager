using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.RetroBoard;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Infrastructure.Slugs;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Application.Services;

/// <summary>
/// The structured, facilitated RetroBoard flow (setup → check-in → capture → introduce →
/// vote → discuss → reflect → summary). Separate from the legacy sprint retro and the
/// free-canvas FunRetro. Realtime updates are broadcast as <c>rb_*</c> events over the
/// existing retro-session presence group.
/// </summary>
public class RetroBoardService(AppDbContext db, AiPromptExecutorService aiExecutor)
{
    private static readonly JsonSerializerOptions Json = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    private static readonly JsonSerializerOptions JsonRead = new() { PropertyNameCaseInsensitive = true };

    private static readonly string[] Phases =
        ["setup", "checkin", "capture", "introduce", "vote", "discuss", "reflect", "summary"];

    // ---------- Queries ----------

    public async Task<List<RetroBoardSummaryDto>> GetOpenSessionsAsync()
    {
        return await db.RetroBoardSessions
            .Where(s => s.Status != "closed")
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new RetroBoardSummaryDto
            {
                Id = s.Id,
                Title = s.Title,
                Slug = s.Slug,
                Phase = s.Phase,
                Status = s.Status,
                SquadName = s.Squad!.Name,
                CreatedByMemberId = s.CreatedByMemberId,
                CreatedByName = s.CreatedBy!.FirstName + " " + s.CreatedBy.LastName,
                ParticipantCount = s.Participants.Count,
                NoteCount = s.Notes.Count,
                CreatedAt = s.CreatedAt,
            })
            .ToListAsync();
    }

    public async Task<Guid?> ResolveSessionIdAsync(string idOrSlug)
    {
        if (Guid.TryParse(idOrSlug, out var guid)) return guid;
        return await db.RetroBoardSessions
            .Where(s => s.Slug == idOrSlug)
            .Select(s => (Guid?)s.Id)
            .FirstOrDefaultAsync();
    }

    public async Task<RetroBoardSessionDto?> GetSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await LoadFullAsync(sessionId);
        return session is null ? null : ToDto(session, memberId);
    }

    // ---------- Lifecycle ----------

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
            Phase = "setup",
            Status = "draft",
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

        // Creator joins as the first facilitator.
        session.Participants = [new RetroBoardParticipant { MemberId = memberId, Role = "facilitator" }];

        db.RetroBoardSessions.Add(session);
        await db.SaveChangesAsync();

        return (await GetSessionAsync(session.Id, memberId))!;
    }

    public async Task<RetroBoardSessionDto?> JoinAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.RetroBoardSessions.FindAsync(sessionId);
        if (session is null || session.Status == "closed") return null;

        var existing = await db.RetroBoardParticipants
            .FirstOrDefaultAsync(p => p.RetroBoardSessionId == sessionId && p.MemberId == memberId);
        if (existing is null)
        {
            var role = session.CreatedByMemberId == memberId ? "facilitator" : "participant";
            db.RetroBoardParticipants.Add(new RetroBoardParticipant { RetroBoardSessionId = sessionId, MemberId = memberId, Role = role });
            await db.SaveChangesAsync();
            Broadcast(sessionId, "rb_participant_changed");
        }
        else
        {
            existing.LastSeenAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
        }
        return await GetSessionAsync(sessionId, memberId);
    }

    public async Task<bool> DeleteSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.RetroBoardSessions.FindAsync(sessionId);
        if (session is null || session.CreatedByMemberId != memberId) return false;
        db.RetroBoardSessions.Remove(session);
        await db.SaveChangesAsync();
        _ = WebSocketMiddleware.BroadcastAsync("rb_session_deleted", new { sessionId }, guestAllowed: true);
        return true;
    }

    public async Task<RetroBoardSessionDto?> SetPhaseAsync(Guid sessionId, Guid memberId, string phase)
    {
        if (!Phases.Contains(phase)) return null;
        var session = await db.RetroBoardSessions.FindAsync(sessionId);
        if (session is null || !await IsFacilitatorAsync(sessionId, memberId)) return null;

        session.Phase = phase;
        if (session.Status == "draft" && phase != "setup") { session.Status = "live"; session.StartedAt ??= DateTimeOffset.UtcNow; }
        if (phase == "summary") { session.Status = "closed"; session.ClosedAt ??= DateTimeOffset.UtcNow; }
        await db.SaveChangesAsync();

        Broadcast(sessionId, "rb_phase_changed", new { sessionId, phase });
        return await GetSessionAsync(sessionId, memberId);
    }

    public async Task<bool> UpdateSettingsAsync(Guid sessionId, Guid memberId, UpdateRetroBoardSettingsRequest req)
    {
        var session = await db.RetroBoardSessions.FindAsync(sessionId);
        if (session is null || !await IsFacilitatorAsync(sessionId, memberId)) return false;

        if (req.VotesPerUser is > 0 and <= 99) session.VotesPerUser = req.VotesPerUser.Value;
        if (req.AllowAnonymous is { } anon) session.AllowAnonymous = anon;
        if (req.HideNotesUntilReveal is { } hide) session.HideNotesUntilReveal = hide;
        if (req.StepDurations is { } dur) session.StepDurationsJson = JsonSerializer.Serialize(dur, Json);
        await db.SaveChangesAsync();

        Broadcast(sessionId, "rb_settings_updated");
        return true;
    }

    public async Task<bool> RevealNotesAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.RetroBoardSessions.FindAsync(sessionId);
        if (session is null || !await IsFacilitatorAsync(sessionId, memberId)) return false;
        session.NotesRevealed = true;
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_revealed", new { sessionId });
        return true;
    }

    /// <summary>Facilitator-driven transient live state (intro stage, spotlight note id, running clock).</summary>
    public async Task<bool> SetLiveStateAsync(Guid sessionId, Guid memberId, string? liveStateJson)
    {
        var session = await db.RetroBoardSessions.FindAsync(sessionId);
        if (session is null || !await IsFacilitatorAsync(sessionId, memberId)) return false;
        session.LiveStateJson = liveStateJson;
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_live_state", new { sessionId, liveStateJson });
        return true;
    }

    public async Task<(bool ok, string? error, RetroBoardAiSummaryDto? summary)> AnalyseAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.RetroBoardSessions
            .Include(s => s.Notes).ThenInclude(n => n.Column)
            .FirstOrDefaultAsync(s => s.Id == sessionId);
        if (session is null) return (false, "Session not found.", null);
        if (!await IsFacilitatorAsync(sessionId, memberId)) return (false, "Only a facilitator can generate the summary.", null);
        if (session.Notes.Count == 0) return (false, "No notes to summarise.", null);

        var byColumn = session.Notes
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

        session.AiSummaryJson = JsonSerializer.Serialize(summary, Json);
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_summary_ready", new { sessionId });
        return (true, null, summary);
    }

    // ---------- Columns (setup) ----------

    public async Task<RetroBoardColumnDto?> AddColumnAsync(Guid sessionId, Guid memberId, RetroColumnInput input)
    {
        if (!await IsFacilitatorAsync(sessionId, memberId)) return null;
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
        return new RetroBoardColumnDto { Id = col.Id, Key = col.Key, Label = col.Label, Description = col.Description, Color = col.Color, Icon = col.Icon, SortOrder = col.SortOrder };
    }

    public async Task<bool> UpdateColumnAsync(Guid sessionId, Guid memberId, Guid columnId, RetroColumnInput input)
    {
        if (!await IsFacilitatorAsync(sessionId, memberId)) return false;
        var col = await db.RetroBoardColumns.FirstOrDefaultAsync(c => c.Id == columnId && c.RetroBoardSessionId == sessionId);
        if (col is null) return false;
        col.Label = input.Label.Trim(); col.Description = input.Description; col.Color = input.Color; col.Icon = input.Icon;
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_columns_changed");
        return true;
    }

    public async Task<bool> DeleteColumnAsync(Guid sessionId, Guid memberId, Guid columnId)
    {
        if (!await IsFacilitatorAsync(sessionId, memberId)) return false;
        var col = await db.RetroBoardColumns.Include(c => c.Notes).FirstOrDefaultAsync(c => c.Id == columnId && c.RetroBoardSessionId == sessionId);
        if (col is null) return false;
        if (col.Notes.Count > 0) db.RetroBoardNotes.RemoveRange(col.Notes);   // Restrict FK -- clear notes first
        db.RetroBoardColumns.Remove(col);
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_columns_changed");
        return true;
    }

    // ---------- Notes ----------

    public async Task<RetroBoardSessionDto?> AddNoteAsync(Guid sessionId, Guid memberId, AddRetroBoardNoteRequest req)
    {
        var session = await db.RetroBoardSessions.FindAsync(sessionId);
        if (session is null) return null;
        var columnOk = await db.RetroBoardColumns.AnyAsync(c => c.Id == req.ColumnId && c.RetroBoardSessionId == sessionId);
        if (!columnOk || string.IsNullOrWhiteSpace(req.Text)) return null;

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
        return await GetSessionAsync(sessionId, memberId);
    }

    public async Task<bool> UpdateNoteTextAsync(Guid sessionId, Guid memberId, Guid noteId, string text)
    {
        var note = await db.RetroBoardNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.RetroBoardSessionId == sessionId);
        if (note is null || string.IsNullOrWhiteSpace(text)) return false;
        var isFacil = await IsFacilitatorAsync(sessionId, memberId);
        if (note.AuthorMemberId != memberId && !isFacil) return false;
        note.Text = text.Trim();
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_note_updated", new { sessionId, noteId });
        return true;
    }

    public async Task<bool> DeleteNoteAsync(Guid sessionId, Guid memberId, Guid noteId)
    {
        var note = await db.RetroBoardNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.RetroBoardSessionId == sessionId);
        if (note is null) return false;
        var isFacil = await IsFacilitatorAsync(sessionId, memberId);
        if (note.AuthorMemberId != memberId && !isFacil) return false;
        db.RetroBoardNotes.Remove(note);
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_note_deleted", new { sessionId, noteId });
        return true;
    }

    public async Task<bool> FlagNoteAsync(Guid sessionId, Guid memberId, Guid noteId, bool flagged)
    {
        _ = memberId; // anyone in the session may flag
        var note = await db.RetroBoardNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.RetroBoardSessionId == sessionId);
        if (note is null) return false;
        note.Flagged = flagged;
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_note_updated", new { sessionId, noteId });
        return true;
    }

    public async Task<bool> ClarifyNoteAsync(Guid sessionId, Guid memberId, Guid noteId, string? clarification)
    {
        var note = await db.RetroBoardNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.RetroBoardSessionId == sessionId);
        if (note is null) return false;
        var isFacil = await IsFacilitatorAsync(sessionId, memberId);
        if (note.AuthorMemberId != memberId && !isFacil) return false;
        note.Clarification = string.IsNullOrWhiteSpace(clarification) ? null : clarification.Trim();
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_note_updated", new { sessionId, noteId });
        return true;
    }

    public async Task<bool> SetIntroducedAsync(Guid sessionId, Guid memberId, Guid noteId, bool introduced)
    {
        if (!await IsFacilitatorAsync(sessionId, memberId)) return false;
        var note = await db.RetroBoardNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.RetroBoardSessionId == sessionId);
        if (note is null) return false;
        note.IntroducedAt = introduced ? DateTimeOffset.UtcNow : null;
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_note_updated", new { sessionId, noteId });
        return true;
    }

    // ---------- Votes ----------

    public async Task<(bool ok, string? error)> AddVoteAsync(Guid sessionId, Guid memberId, Guid noteId)
    {
        var session = await db.RetroBoardSessions.FindAsync(sessionId);
        if (session is null) return (false, "Session not found.");
        var noteOk = await db.RetroBoardNotes.AnyAsync(n => n.Id == noteId && n.RetroBoardSessionId == sessionId);
        if (!noteOk) return (false, "Note not found.");

        var used = await db.RetroBoardVotes.CountAsync(v => v.Note!.RetroBoardSessionId == sessionId && v.MemberId == memberId);
        if (used >= session.VotesPerUser) return (false, "No votes left.");

        var onThisNote = await db.RetroBoardVotes.CountAsync(v => v.RetroBoardNoteId == noteId && v.MemberId == memberId);
        if (onThisNote >= 3) return (false, "Max 3 votes per topic.");

        db.RetroBoardVotes.Add(new RetroBoardVote { RetroBoardNoteId = noteId, MemberId = memberId });
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_voted", new { sessionId, noteId });
        return (true, null);
    }

    public async Task<bool> RemoveVoteAsync(Guid sessionId, Guid memberId, Guid noteId)
    {
        var vote = await db.RetroBoardVotes
            .Where(v => v.RetroBoardNoteId == noteId && v.MemberId == memberId && v.Note!.RetroBoardSessionId == sessionId)
            .OrderByDescending(v => v.CreatedAt)
            .FirstOrDefaultAsync();
        if (vote is null) return false;
        db.RetroBoardVotes.Remove(vote);
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_voted", new { sessionId, noteId });
        return true;
    }

    // ---------- Check-in ----------

    public async Task<RetroBoardCheckinQuestionDto?> AddCheckinQuestionAsync(Guid sessionId, Guid memberId, CheckinQuestionInput input)
    {
        if (!await IsFacilitatorAsync(sessionId, memberId) || string.IsNullOrWhiteSpace(input.Text)) return null;
        var order = (await db.RetroBoardCheckinQuestions.Where(q => q.RetroBoardSessionId == sessionId).MaxAsync(q => (int?)q.SortOrder) ?? -1) + 1;
        var q = new RetroBoardCheckinQuestion { RetroBoardSessionId = sessionId, Text = input.Text.Trim(), ContextText = input.ContextText, SortOrder = order };
        db.RetroBoardCheckinQuestions.Add(q);
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_checkin_changed");
        return new RetroBoardCheckinQuestionDto { Id = q.Id, Text = q.Text, ContextText = q.ContextText, SortOrder = q.SortOrder };
    }

    public async Task<bool> DeleteCheckinQuestionAsync(Guid sessionId, Guid memberId, Guid questionId)
    {
        if (!await IsFacilitatorAsync(sessionId, memberId)) return false;
        var q = await db.RetroBoardCheckinQuestions.FirstOrDefaultAsync(x => x.Id == questionId && x.RetroBoardSessionId == sessionId);
        if (q is null) return false;
        db.RetroBoardCheckinQuestions.Remove(q);
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_checkin_changed");
        return true;
    }

    public async Task<bool> RespondCheckinAsync(Guid sessionId, Guid memberId, Guid questionId, string rating)
    {
        string[] valid = ["better", "same", "worse", "na"];
        if (!valid.Contains(rating)) return false;
        var q = await db.RetroBoardCheckinQuestions.AnyAsync(x => x.Id == questionId && x.RetroBoardSessionId == sessionId);
        if (!q) return false;
        var existing = await db.RetroBoardCheckinResponses.FirstOrDefaultAsync(r => r.RetroBoardCheckinQuestionId == questionId && r.MemberId == memberId);
        if (existing is null)
            db.RetroBoardCheckinResponses.Add(new RetroBoardCheckinResponse { RetroBoardCheckinQuestionId = questionId, MemberId = memberId, Rating = rating });
        else
            existing.Rating = rating;
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_checkin_responded", new { sessionId, questionId });
        return true;
    }

    // ---------- Actions ----------

    public async Task<RetroBoardActionDto?> AddActionAsync(Guid sessionId, Guid memberId, AddRetroBoardActionRequest req)
    {
        if (!await IsFacilitatorAsync(sessionId, memberId) || string.IsNullOrWhiteSpace(req.Title)) return null;
        var action = new RetroBoardAction
        {
            RetroBoardSessionId = sessionId, Title = req.Title.Trim(), OwnerMemberId = req.OwnerMemberId, SourceNoteId = req.SourceNoteId,
            AssigneeMemberIdsJson = req.AssigneeMemberIds is { Count: > 0 } ? JsonSerializer.Serialize(req.AssigneeMemberIds, Json) : null,
        };
        db.RetroBoardActions.Add(action);
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_action_changed");
        return await MapActionAsync(action.Id);
    }

    public async Task<bool> UpdateActionAsync(Guid sessionId, Guid memberId, Guid actionId, UpdateRetroBoardActionRequest req)
    {
        if (!await IsFacilitatorAsync(sessionId, memberId)) return false;
        var a = await db.RetroBoardActions.FirstOrDefaultAsync(x => x.Id == actionId && x.RetroBoardSessionId == sessionId);
        if (a is null) return false;
        if (req.Title is { } t && !string.IsNullOrWhiteSpace(t)) a.Title = t.Trim();
        if (req.Status is { } s) a.Status = s;
        a.OwnerMemberId = req.OwnerMemberId ?? a.OwnerMemberId;
        a.DueDate = req.DueDate ?? a.DueDate;
        if (req.AssigneeMemberIds is { } ids) a.AssigneeMemberIdsJson = ids.Count > 0 ? JsonSerializer.Serialize(ids, Json) : null;
        a.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_action_changed");
        return true;
    }

    public async Task<bool> DeleteActionAsync(Guid sessionId, Guid memberId, Guid actionId)
    {
        if (!await IsFacilitatorAsync(sessionId, memberId)) return false;
        var a = await db.RetroBoardActions.FirstOrDefaultAsync(x => x.Id == actionId && x.RetroBoardSessionId == sessionId);
        if (a is null) return false;
        db.RetroBoardActions.Remove(a);
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_action_changed");
        return true;
    }

    // ---------- Participants ----------

    public async Task<bool> SetProgressAsync(Guid sessionId, Guid memberId, string phase, bool completed)
    {
        var participant = await db.RetroBoardParticipants.FirstOrDefaultAsync(p => p.RetroBoardSessionId == sessionId && p.MemberId == memberId);
        if (participant is null) return false;
        var existing = await db.RetroBoardParticipantProgress.FirstOrDefaultAsync(x => x.RetroBoardParticipantId == participant.Id && x.Phase == phase);
        if (completed && existing is null)
            db.RetroBoardParticipantProgress.Add(new RetroBoardParticipantProgress { RetroBoardParticipantId = participant.Id, Phase = phase });
        else if (!completed && existing is not null)
            db.RetroBoardParticipantProgress.Remove(existing);
        else return true;
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_progress_updated", new { sessionId, memberId, phase, completed });
        return true;
    }

    public async Task<bool> SetSelfPacedAsync(Guid sessionId, Guid memberId, bool isSelfPaced)
    {
        var session = await db.RetroBoardSessions.FindAsync(sessionId);
        if (session is null) return false;
        // Self-paced is only honoured before the session goes live.
        if (isSelfPaced && session.Phase != "setup") return false;
        var participant = await db.RetroBoardParticipants.FirstOrDefaultAsync(p => p.RetroBoardSessionId == sessionId && p.MemberId == memberId);
        if (participant is null) return false;
        participant.IsSelfPaced = isSelfPaced;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SetParticipantRoleAsync(Guid sessionId, Guid actingMemberId, Guid targetMemberId, string role)
    {
        if (role is not ("facilitator" or "participant")) return false;
        if (!await IsFacilitatorAsync(sessionId, actingMemberId)) return false;
        var target = await db.RetroBoardParticipants.FirstOrDefaultAsync(p => p.RetroBoardSessionId == sessionId && p.MemberId == targetMemberId);
        if (target is null) return false;
        // The creator can't be demoted.
        var creatorId = await db.RetroBoardSessions.Where(s => s.Id == sessionId).Select(s => s.CreatedByMemberId).FirstOrDefaultAsync();
        if (target.MemberId == creatorId && role != "facilitator") return false;
        target.Role = role;
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_participant_changed");
        return true;
    }

    // ---------- Helpers ----------

    private static void Broadcast(Guid sessionId, string type, object? data = null) =>
        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync(type, sessionId.ToString(), data ?? new { sessionId });

    private static List<Guid> ParseAssignees(string? json) =>
        string.IsNullOrEmpty(json) ? [] : (JsonSerializer.Deserialize<List<Guid>>(json, JsonRead) ?? []);

    private async Task<bool> IsFacilitatorAsync(Guid sessionId, Guid memberId)
    {
        var creatorId = await db.RetroBoardSessions.Where(s => s.Id == sessionId).Select(s => (Guid?)s.CreatedByMemberId).FirstOrDefaultAsync();
        if (creatorId == memberId) return true;
        return await db.RetroBoardParticipants.AnyAsync(p => p.RetroBoardSessionId == sessionId && p.MemberId == memberId && p.Role == "facilitator");
    }

    private Task<RetroBoardSession?> LoadFullAsync(Guid sessionId) =>
        db.RetroBoardSessions
            .Include(s => s.Squad)
            .Include(s => s.Sprint)
            .Include(s => s.Columns)
            .Include(s => s.Notes).ThenInclude(n => n.Author)
            .Include(s => s.Notes).ThenInclude(n => n.Votes)
            .Include(s => s.CheckinQuestions).ThenInclude(q => q.Responses)
            .Include(s => s.Participants).ThenInclude(p => p.Member)
            .Include(s => s.Participants).ThenInclude(p => p.Progress)
            .Include(s => s.Actions).ThenInclude(a => a.Owner)
            .AsSplitQuery()
            .FirstOrDefaultAsync(s => s.Id == sessionId);

    private async Task<RetroBoardActionDto?> MapActionAsync(Guid actionId)
    {
        var a = await db.RetroBoardActions.Include(x => x.Owner).FirstOrDefaultAsync(x => x.Id == actionId);
        return a is null ? null : new RetroBoardActionDto
        {
            Id = a.Id, SourceNoteId = a.SourceNoteId, Title = a.Title, OwnerMemberId = a.OwnerMemberId,
            OwnerName = a.Owner is null ? null : $"{a.Owner.FirstName} {a.Owner.LastName}".Trim(),
            AssigneeMemberIds = ParseAssignees(a.AssigneeMemberIdsJson),
            Status = a.Status, DueDate = a.DueDate, IsAiSuggested = a.IsAiSuggested,
        };
    }

    private RetroBoardSessionDto ToDto(RetroBoardSession s, Guid memberId)
    {
        var isFacil = s.CreatedByMemberId == memberId || s.Participants.Any(p => p.MemberId == memberId && p.Role == "facilitator");
        var hideOthers = s.HideNotesUntilReveal && !s.NotesRevealed && s.Phase == "capture";
        var colKeyById = s.Columns.ToDictionary(c => c.Id, c => c.Key);
        var myVotesUsed = s.Notes.SelectMany(n => n.Votes).Count(v => v.MemberId == memberId);

        return new RetroBoardSessionDto
        {
            Id = s.Id,
            Slug = s.Slug,
            Title = s.Title,
            SquadId = s.SquadId,
            SquadName = s.Squad?.Name,
            SprintId = s.SprintId,
            SprintName = s.Sprint?.Name,
            CreatedByMemberId = s.CreatedByMemberId,
            IsFacilitator = isFacil,
            Phase = s.Phase,
            Status = s.Status,
            VotesPerUser = s.VotesPerUser,
            MyVotesUsed = myVotesUsed,
            AllowAnonymous = s.AllowAnonymous,
            HideNotesUntilReveal = s.HideNotesUntilReveal,
            NotesRevealed = s.NotesRevealed,
            StepDurations = string.IsNullOrEmpty(s.StepDurationsJson)
                ? new RetroStepDurations()
                : JsonSerializer.Deserialize<RetroStepDurations>(s.StepDurationsJson, JsonRead) ?? new RetroStepDurations(),
            LiveStateJson = s.LiveStateJson,
            AiSummary = string.IsNullOrEmpty(s.AiSummaryJson) ? null : JsonSerializer.Deserialize<RetroBoardAiSummaryDto>(s.AiSummaryJson, JsonRead),
            CreatedAt = s.CreatedAt,
            StartedAt = s.StartedAt,
            ClosedAt = s.ClosedAt,
            Columns = s.Columns.OrderBy(c => c.SortOrder).Select(c => new RetroBoardColumnDto
            {
                Id = c.Id, Key = c.Key, Label = c.Label, Description = c.Description, Color = c.Color, Icon = c.Icon, SortOrder = c.SortOrder,
            }).ToList(),
            Notes = s.Notes.OrderBy(n => n.CreatedAt).Select(n =>
            {
                var isOwn = n.AuthorMemberId.HasValue && n.AuthorMemberId == memberId;
                var hidden = hideOthers && !isOwn && !isFacil;
                return new RetroBoardNoteDto
                {
                    Id = n.Id,
                    ColumnId = n.RetroBoardColumnId,
                    ColumnKey = colKeyById.GetValueOrDefault(n.RetroBoardColumnId, ""),
                    Text = hidden ? null : n.Text,
                    AuthorId = (n.IsAnonymous || hidden) ? null : n.AuthorMemberId,
                    AuthorName = (n.IsAnonymous || hidden) ? null : (n.Author is null ? null : $"{n.Author.FirstName} {n.Author.LastName}".Trim()),
                    AuthorAvatarSeed = (n.IsAnonymous || hidden) ? null : n.Author?.AvatarSeed,
                    IsAnonymous = n.IsAnonymous,
                    IsOwn = isOwn,
                    Flagged = n.Flagged,
                    Clarification = hidden ? null : n.Clarification,
                    IntroducedAt = n.IntroducedAt,
                    CreatedAt = n.CreatedAt,
                    VoteCount = n.Votes.Count,
                    MyVoteCount = n.Votes.Count(v => v.MemberId == memberId),
                };
            }).ToList(),
            CheckinQuestions = s.CheckinQuestions.OrderBy(q => q.SortOrder).Select(q => new RetroBoardCheckinQuestionDto
            {
                Id = q.Id, Text = q.Text, ContextText = q.ContextText, SourceActionId = q.SourceActionId, SortOrder = q.SortOrder,
                MyRating = q.Responses.FirstOrDefault(r => r.MemberId == memberId)?.Rating,
                Better = q.Responses.Count(r => r.Rating == "better"),
                Same = q.Responses.Count(r => r.Rating == "same"),
                Worse = q.Responses.Count(r => r.Rating == "worse"),
                Na = q.Responses.Count(r => r.Rating == "na"),
            }).ToList(),
            Participants = s.Participants.OrderBy(p => p.JoinedAt).Select(p => new RetroBoardParticipantDto
            {
                Id = p.Id, MemberId = p.MemberId,
                Name = p.Member is null ? "" : $"{p.Member.FirstName} {p.Member.LastName}".Trim(),
                AvatarSeed = p.Member?.AvatarSeed, Role = p.Role, IsSelfPaced = p.IsSelfPaced,
                CompletedPhases = p.Progress.Select(x => x.Phase).ToList(),
            }).ToList(),
            Actions = s.Actions.OrderBy(a => a.CreatedAt).Select(a => new RetroBoardActionDto
            {
                Id = a.Id, SourceNoteId = a.SourceNoteId, Title = a.Title, OwnerMemberId = a.OwnerMemberId,
                OwnerName = a.Owner is null ? null : $"{a.Owner.FirstName} {a.Owner.LastName}".Trim(),
                AssigneeMemberIds = ParseAssignees(a.AssigneeMemberIdsJson),
                Status = a.Status, DueDate = a.DueDate, IsAiSuggested = a.IsAiSuggested,
            }).ToList(),
        };
    }

    private async Task<List<RetroBoardCheckinQuestion>> SeedCheckinFromPreviousAsync(Guid squadId)
    {
        var prev = await db.RetroBoardSessions
            .Where(s => s.SquadId == squadId && s.Status == "closed")
            .OrderByDescending(s => s.ClosedAt)
            .Include(s => s.Actions)
            .FirstOrDefaultAsync();
        if (prev is null) return [];

        return prev.Actions
            .Where(a => a.Status != "done")
            .Select((a, i) => new RetroBoardCheckinQuestion
            {
                Text = a.Title,
                ContextText = $"Last retro: {a.Title}",
                SourceActionId = a.Id,
                SortOrder = i,
            }).ToList();
    }

    private static List<RetroBoardColumn> DefaultColumns() =>
    [
        new() { Key = "well",   Label = "What Went Well",  Description = "Celebrate wins & strengths", Color = "#2fd47e", Icon = "spark", SortOrder = 0 },
        new() { Key = "better", Label = "What to Improve",  Description = "Things that could be better", Color = "#f4566b", Icon = "tri",   SortOrder = 1 },
        new() { Key = "quest",  Label = "Questions",        Description = "Seek clarity",                Color = "#f5b544", Icon = "quest", SortOrder = 2 },
        new() { Key = "shout",  Label = "Shout-outs",       Description = "Recognition & gratitude",     Color = "#5b9dff", Icon = "star",  SortOrder = 3 },
    ];

    private async Task<string> GenerateUniqueSlugAsync()
    {
        for (var i = 0; i < 10; i++)
        {
            var candidate = SlugGenerator.Generate();
            if (!await db.RetroBoardSessions.AnyAsync(s => s.Slug == candidate)) return candidate;
        }
        return $"{SlugGenerator.Generate()}-{Guid.NewGuid().ToString()[..4]}";
    }
}
