using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.RetroBoard;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("retro")]
[Route("api/v1/retro-board")]
public class RetroBoardController(RetroBoardService service) : ControllerBase
{
    // ---------- Sessions ----------

    [HttpGet]
    public async Task<IActionResult> GetOpenSessions() => Ok(await service.GetOpenSessionsAsync());

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRetroBoardSessionRequest request)
    {
        var memberId = GetMemberId();
        if (memberId is null) return Unauthorized();
        var session = await service.CreateSessionAsync(memberId.Value, request);
        return CreatedAtAction(nameof(Get), new { id = session.Id }, session);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(string id)
    {
        var memberId = GetMemberId();
        if (memberId is null) return Unauthorized();
        var sessionId = await service.ResolveSessionIdAsync(id);
        if (sessionId is null) return NotFound();
        var dto = await service.GetSessionAsync(sessionId.Value, memberId.Value);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost("{id}/join")]
    public async Task<IActionResult> Join(string id)
    {
        var memberId = GetMemberId();
        if (memberId is null) return Unauthorized();
        var sessionId = await service.ResolveSessionIdAsync(id);
        if (sessionId is null) return NotFound();
        var dto = await service.JoinAsync(sessionId.Value, memberId.Value);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id) =>
        await Guard(m => service.DeleteSessionAsync(id, m));

    [HttpPut("{id:guid}/phase")]
    public async Task<IActionResult> SetPhase(Guid id, [FromBody] SetPhaseRequest req)
    {
        var memberId = GetMemberId();
        if (memberId is null) return Unauthorized();
        var dto = await service.SetPhaseAsync(id, memberId.Value, req.Phase);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPatch("{id:guid}/settings")]
    public async Task<IActionResult> UpdateSettings(Guid id, [FromBody] UpdateRetroBoardSettingsRequest req) =>
        await Guard(m => service.UpdateSettingsAsync(id, m, req));

    [HttpPost("{id:guid}/reveal")]
    public async Task<IActionResult> Reveal(Guid id) =>
        await Guard(m => service.RevealNotesAsync(id, m));

    [HttpPut("{id:guid}/live-state")]
    public async Task<IActionResult> SetLiveState(Guid id, [FromBody] LiveStateRequest req) =>
        await Guard(m => service.SetLiveStateAsync(id, m, req.LiveStateJson));

    [HttpPost("{id:guid}/analyse")]
    public async Task<IActionResult> Analyse(Guid id)
    {
        var memberId = GetMemberId();
        if (memberId is null) return Unauthorized();
        var (ok, error, summary) = await service.AnalyseAsync(id, memberId.Value);
        return ok ? Ok(summary) : BadRequest(new { error });
    }

    // ---------- Columns ----------

    [HttpPost("{id:guid}/columns")]
    public async Task<IActionResult> AddColumn(Guid id, [FromBody] RetroColumnInput input)
    {
        var memberId = GetMemberId();
        if (memberId is null) return Unauthorized();
        var col = await service.AddColumnAsync(id, memberId.Value, input);
        return col is null ? NotFound() : Ok(col);
    }

    [HttpPut("{id:guid}/columns/{columnId:guid}")]
    public async Task<IActionResult> UpdateColumn(Guid id, Guid columnId, [FromBody] RetroColumnInput input) =>
        await Guard(m => service.UpdateColumnAsync(id, m, columnId, input));

    [HttpDelete("{id:guid}/columns/{columnId:guid}")]
    public async Task<IActionResult> DeleteColumn(Guid id, Guid columnId) =>
        await Guard(m => service.DeleteColumnAsync(id, m, columnId));

    // ---------- Notes ----------

    [HttpPost("{id:guid}/notes")]
    public async Task<IActionResult> AddNote(Guid id, [FromBody] AddRetroBoardNoteRequest req)
    {
        var memberId = GetMemberId();
        if (memberId is null) return Unauthorized();
        var dto = await service.AddNoteAsync(id, memberId.Value, req);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPatch("{id:guid}/notes/{noteId:guid}/text")]
    public async Task<IActionResult> UpdateNoteText(Guid id, Guid noteId, [FromBody] NoteTextRequest req) =>
        await Guard(m => service.UpdateNoteTextAsync(id, m, noteId, req.Text));

    [HttpDelete("{id:guid}/notes/{noteId:guid}")]
    public async Task<IActionResult> DeleteNote(Guid id, Guid noteId) =>
        await Guard(m => service.DeleteNoteAsync(id, m, noteId));

    [HttpPatch("{id:guid}/notes/{noteId:guid}/flag")]
    public async Task<IActionResult> FlagNote(Guid id, Guid noteId, [FromBody] FlagRequest req) =>
        await Guard(m => service.FlagNoteAsync(id, m, noteId, req.Flagged));

    [HttpPatch("{id:guid}/notes/{noteId:guid}/clarify")]
    public async Task<IActionResult> ClarifyNote(Guid id, Guid noteId, [FromBody] ClarifyRequest req) =>
        await Guard(m => service.ClarifyNoteAsync(id, m, noteId, req.Clarification));

    [HttpPost("{id:guid}/notes/{noteId:guid}/introduced")]
    public async Task<IActionResult> MarkIntroduced(Guid id, Guid noteId, [FromBody] FlagRequest req) =>
        await Guard(m => service.SetIntroducedAsync(id, m, noteId, req.Flagged));

    // ---------- Votes ----------

    [HttpPost("{id:guid}/notes/{noteId:guid}/vote")]
    public async Task<IActionResult> AddVote(Guid id, Guid noteId)
    {
        var memberId = GetMemberId();
        if (memberId is null) return Unauthorized();
        var (ok, error) = await service.AddVoteAsync(id, memberId.Value, noteId);
        return ok ? Ok() : Conflict(new { error });
    }

    [HttpDelete("{id:guid}/notes/{noteId:guid}/vote")]
    public async Task<IActionResult> RemoveVote(Guid id, Guid noteId) =>
        await Guard(m => service.RemoveVoteAsync(id, m, noteId));

    // ---------- Check-in ----------

    [HttpPost("{id:guid}/checkin-questions")]
    public async Task<IActionResult> AddCheckinQuestion(Guid id, [FromBody] CheckinQuestionInput input)
    {
        var memberId = GetMemberId();
        if (memberId is null) return Unauthorized();
        var q = await service.AddCheckinQuestionAsync(id, memberId.Value, input);
        return q is null ? NotFound() : Ok(q);
    }

    [HttpDelete("{id:guid}/checkin-questions/{questionId:guid}")]
    public async Task<IActionResult> DeleteCheckinQuestion(Guid id, Guid questionId) =>
        await Guard(m => service.DeleteCheckinQuestionAsync(id, m, questionId));

    [HttpPost("{id:guid}/checkin-questions/{questionId:guid}/respond")]
    public async Task<IActionResult> RespondCheckin(Guid id, Guid questionId, [FromBody] CheckinResponseRequest req) =>
        await Guard(m => service.RespondCheckinAsync(id, m, questionId, req.Rating));

    // ---------- Feedback ----------

    [HttpPost("{id:guid}/feedback-prompts")]
    public async Task<IActionResult> AddFeedbackPrompt(Guid id, [FromBody] FeedbackPromptInput input)
    {
        var memberId = GetMemberId();
        if (memberId is null) return Unauthorized();
        var p = await service.AddFeedbackPromptAsync(id, memberId.Value, input);
        return p is null ? NotFound() : Ok(p);
    }

    [HttpDelete("{id:guid}/feedback-prompts/{promptId:guid}")]
    public async Task<IActionResult> DeleteFeedbackPrompt(Guid id, Guid promptId) =>
        await Guard(m => service.DeleteFeedbackPromptAsync(id, m, promptId));

    [HttpPost("{id:guid}/feedback-prompts/{promptId:guid}/respond")]
    public async Task<IActionResult> RespondFeedback(Guid id, Guid promptId, [FromBody] FeedbackResponseRequest req) =>
        await Guard(m => service.RespondFeedbackAsync(id, m, promptId, req.Score, req.Comment));

    // ---------- Actions ----------

    [HttpPost("{id:guid}/actions")]
    public async Task<IActionResult> AddAction(Guid id, [FromBody] AddRetroBoardActionRequest req)
    {
        var memberId = GetMemberId();
        if (memberId is null) return Unauthorized();
        var a = await service.AddActionAsync(id, memberId.Value, req);
        return a is null ? NotFound() : Ok(a);
    }

    [HttpPatch("{id:guid}/actions/{actionId:guid}")]
    public async Task<IActionResult> UpdateAction(Guid id, Guid actionId, [FromBody] UpdateRetroBoardActionRequest req) =>
        await Guard(m => service.UpdateActionAsync(id, m, actionId, req));

    [HttpDelete("{id:guid}/actions/{actionId:guid}")]
    public async Task<IActionResult> DeleteAction(Guid id, Guid actionId) =>
        await Guard(m => service.DeleteActionAsync(id, m, actionId));

    // ---------- Participants ----------

    [HttpPost("{id:guid}/progress")]
    public async Task<IActionResult> SetProgress(Guid id, [FromBody] ProgressRequest req) =>
        await Guard(m => service.SetProgressAsync(id, m, req.Phase, req.Completed));

    [HttpPost("{id:guid}/self-paced")]
    public async Task<IActionResult> SetSelfPaced(Guid id, [FromBody] SelfPacedRequest req) =>
        await Guard(m => service.SetSelfPacedAsync(id, m, req.IsSelfPaced));

    [HttpPut("{id:guid}/participants/role")]
    public async Task<IActionResult> SetParticipantRole(Guid id, [FromBody] SetParticipantRoleRequest req) =>
        await Guard(m => service.SetParticipantRoleAsync(id, m, req.MemberId, req.Role));

    // ---------- Plumbing ----------

    private Guid? GetMemberId()
    {
        var claim = User.FindFirst("TMID")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }

    private async Task<IActionResult> Guard(Func<Guid, Task<bool>> action)
    {
        var memberId = GetMemberId();
        if (memberId is null) return Unauthorized();
        return await action(memberId.Value) ? NoContent() : NotFound();
    }
}
