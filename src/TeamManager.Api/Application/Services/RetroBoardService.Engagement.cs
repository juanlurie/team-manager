using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.RetroBoard;
using TeamManager.Api.Domain.Entities;
using static TeamManager.Api.Domain.Entities.RetroBoardConstants;

namespace TeamManager.Api.Application.Services;

// Participant engagement that outlives the live board: check-in responses, the anonymous feedback
// survey, action items, and participant progress/roles. Feedback and actions are intentionally
// exempt from the close-lock (they're collected/tracked after the retro ends).
public partial class RetroBoardService
{
    // ---------- Check-in ----------

    public async Task<(RetroActionResult result, RetroBoardCheckinQuestionDto? value)> AddCheckinQuestionAsync(Guid sessionId, Guid memberId, CheckinQuestionInput input)
    {
        var (guard, _) = await GuardAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: true);
        if (guard != RetroActionResult.Ok) return (guard, null);
        if (string.IsNullOrWhiteSpace(input.Text)) return (RetroActionResult.Invalid, null);
        var order = (await db.RetroBoardCheckinQuestions.Where(q => q.RetroBoardSessionId == sessionId).MaxAsync(q => (int?)q.SortOrder) ?? -1) + 1;
        var q = new RetroBoardCheckinQuestion { RetroBoardSessionId = sessionId, Text = input.Text.Trim(), ContextText = input.ContextText, SortOrder = order };
        db.RetroBoardCheckinQuestions.Add(q);
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_checkin_changed");
        return (RetroActionResult.Ok, new RetroBoardCheckinQuestionDto { Id = q.Id, Text = q.Text, ContextText = q.ContextText, SortOrder = q.SortOrder });
    }

    public async Task<RetroActionResult> DeleteCheckinQuestionAsync(Guid sessionId, Guid memberId, Guid questionId)
    {
        var (guard, _) = await GuardAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: true);
        if (guard != RetroActionResult.Ok) return guard;
        var q = await db.RetroBoardCheckinQuestions.FirstOrDefaultAsync(x => x.Id == questionId && x.RetroBoardSessionId == sessionId);
        if (q is null) return RetroActionResult.NotFound;
        db.RetroBoardCheckinQuestions.Remove(q);
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_checkin_changed");
        return RetroActionResult.Ok;
    }

    public async Task<RetroActionResult> RespondCheckinAsync(Guid sessionId, Guid memberId, Guid questionId, string rating)
    {
        if (!Rating.All.Contains(rating)) return RetroActionResult.Invalid;
        var (guard, _) = await GuardAsync(sessionId, memberId, facilitatorOnly: false, blockClosed: true);
        if (guard != RetroActionResult.Ok) return guard;
        var q = await db.RetroBoardCheckinQuestions.AnyAsync(x => x.Id == questionId && x.RetroBoardSessionId == sessionId);
        if (!q) return RetroActionResult.NotFound;
        var existing = await db.RetroBoardCheckinResponses.FirstOrDefaultAsync(r => r.RetroBoardCheckinQuestionId == questionId && r.MemberId == memberId);
        if (existing is null)
            db.RetroBoardCheckinResponses.Add(new RetroBoardCheckinResponse { RetroBoardCheckinQuestionId = questionId, MemberId = memberId, Rating = rating });
        else
            existing.Rating = rating;
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_checkin_responded", new { sessionId, questionId });
        return RetroActionResult.Ok;
    }

    // ---------- Feedback (intentionally exempt from the close-lock) ----------

    public async Task<(RetroActionResult result, RetroBoardFeedbackPromptDto? value)> AddFeedbackPromptAsync(Guid sessionId, Guid memberId, FeedbackPromptInput input)
    {
        var (guard, _) = await GuardAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: false);
        if (guard != RetroActionResult.Ok) return (guard, null);
        if (string.IsNullOrWhiteSpace(input.Text)) return (RetroActionResult.Invalid, null);
        var order = (await db.RetroBoardFeedbackPrompts.Where(p => p.RetroBoardSessionId == sessionId).MaxAsync(p => (int?)p.SortOrder) ?? -1) + 1;
        var prompt = new RetroBoardFeedbackPrompt { RetroBoardSessionId = sessionId, Text = input.Text.Trim(), SortOrder = order };
        db.RetroBoardFeedbackPrompts.Add(prompt);
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_feedback_changed");
        return (RetroActionResult.Ok, new RetroBoardFeedbackPromptDto { Id = prompt.Id, Text = prompt.Text, SortOrder = prompt.SortOrder });
    }

    public async Task<RetroActionResult> DeleteFeedbackPromptAsync(Guid sessionId, Guid memberId, Guid promptId)
    {
        var (guard, _) = await GuardAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: false);
        if (guard != RetroActionResult.Ok) return guard;
        var prompt = await db.RetroBoardFeedbackPrompts.FirstOrDefaultAsync(p => p.Id == promptId && p.RetroBoardSessionId == sessionId);
        if (prompt is null) return RetroActionResult.NotFound;
        db.RetroBoardFeedbackPrompts.Remove(prompt);
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_feedback_changed");
        return RetroActionResult.Ok;
    }

    public async Task<RetroActionResult> RespondFeedbackAsync(Guid sessionId, Guid memberId, Guid promptId, int score, string? comment)
    {
        if (score is < 1 or > 5) return RetroActionResult.Invalid;
        // Feedback is exempt from the close-lock (submitted after the retro closes) but still
        // requires the caller to be an enrolled participant so the aggregate can't be poisoned.
        var (guard, _) = await GuardAsync(sessionId, memberId, facilitatorOnly: false, blockClosed: false);
        if (guard != RetroActionResult.Ok) return guard;
        var prompt = await db.RetroBoardFeedbackPrompts.AnyAsync(p => p.Id == promptId && p.RetroBoardSessionId == sessionId);
        if (!prompt) return RetroActionResult.NotFound;
        var trimmed = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim();
        var existing = await db.RetroBoardFeedbackResponses.FirstOrDefaultAsync(r => r.RetroBoardFeedbackPromptId == promptId && r.MemberId == memberId);
        if (existing is null)
            db.RetroBoardFeedbackResponses.Add(new RetroBoardFeedbackResponse { RetroBoardFeedbackPromptId = promptId, MemberId = memberId, Score = score, Comment = trimmed });
        else
        {
            existing.Score = score;
            existing.Comment = trimmed;
            existing.UpdatedAt = DateTimeOffset.UtcNow;
        }
        await db.SaveChangesAsync();
        // Only the count changes for other clients; the aggregate itself stays facilitator-only on fetch.
        Broadcast(sessionId, "rb_feedback_responded", new { sessionId, promptId });
        return RetroActionResult.Ok;
    }

    // ---------- Actions (intentionally exempt from the close-lock) ----------

    public async Task<(RetroActionResult result, RetroBoardActionDto? value)> AddActionAsync(Guid sessionId, Guid memberId, AddRetroBoardActionRequest req)
    {
        // Actions are NOT gated by close: they're follow-up items whose status is tracked during the
        // sprint after the retro closes (and carry-forward seeds from closed sessions' actions).
        var (guard, _) = await GuardAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: false);
        if (guard != RetroActionResult.Ok) return (guard, null);
        if (string.IsNullOrWhiteSpace(req.Title)) return (RetroActionResult.Invalid, null);
        var action = new RetroBoardAction
        {
            RetroBoardSessionId = sessionId, Title = req.Title.Trim(), OwnerMemberId = req.OwnerMemberId, SourceNoteId = req.SourceNoteId,
            AssigneeMemberIdsJson = req.AssigneeMemberIds is { Count: > 0 } ? JsonSerializer.Serialize(req.AssigneeMemberIds, Json) : null,
        };
        db.RetroBoardActions.Add(action);
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_action_changed");
        return (RetroActionResult.Ok, await MapActionAsync(action.Id));
    }

    public async Task<RetroActionResult> UpdateActionAsync(Guid sessionId, Guid memberId, Guid actionId, UpdateRetroBoardActionRequest req)
    {
        var (guard, _) = await GuardAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: false);
        if (guard != RetroActionResult.Ok) return guard;
        var a = await db.RetroBoardActions.FirstOrDefaultAsync(x => x.Id == actionId && x.RetroBoardSessionId == sessionId);
        if (a is null) return RetroActionResult.NotFound;
        if (req.Title is { } t && !string.IsNullOrWhiteSpace(t)) a.Title = t.Trim();
        if (req.Status is { } s) a.Status = s;
        a.OwnerMemberId = req.OwnerMemberId ?? a.OwnerMemberId;
        a.DueDate = req.DueDate ?? a.DueDate;
        if (req.AssigneeMemberIds is { } ids) a.AssigneeMemberIdsJson = ids.Count > 0 ? JsonSerializer.Serialize(ids, Json) : null;
        a.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_action_changed");
        return RetroActionResult.Ok;
    }

    public async Task<RetroActionResult> DeleteActionAsync(Guid sessionId, Guid memberId, Guid actionId)
    {
        var (guard, _) = await GuardAsync(sessionId, memberId, facilitatorOnly: true, blockClosed: false);
        if (guard != RetroActionResult.Ok) return guard;
        var a = await db.RetroBoardActions.FirstOrDefaultAsync(x => x.Id == actionId && x.RetroBoardSessionId == sessionId);
        if (a is null) return RetroActionResult.NotFound;
        db.RetroBoardActions.Remove(a);
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_action_changed");
        return RetroActionResult.Ok;
    }

    // ---------- Participants ----------

    public async Task<RetroActionResult> SetParticipantRoleAsync(Guid sessionId, Guid actingMemberId, Guid targetMemberId, string role)
    {
        if (role is not (Role.Facilitator or Role.Participant)) return RetroActionResult.Invalid;
        var (guard, session) = await GuardAsync(sessionId, actingMemberId, facilitatorOnly: true, blockClosed: false);
        if (guard != RetroActionResult.Ok) return guard;
        var target = await db.RetroBoardParticipants.FirstOrDefaultAsync(p => p.RetroBoardSessionId == sessionId && p.MemberId == targetMemberId);
        if (target is null) return RetroActionResult.NotFound;
        // The creator can't be demoted.
        if (target.MemberId == session!.CreatedByMemberId && role != Role.Facilitator) return RetroActionResult.Conflict;
        target.Role = role;
        await db.SaveChangesAsync();
        Broadcast(sessionId, "rb_participant_changed");
        return RetroActionResult.Ok;
    }
}
