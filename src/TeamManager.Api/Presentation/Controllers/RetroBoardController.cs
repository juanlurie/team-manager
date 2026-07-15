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
    public async Task<IActionResult> GetLobbySessions()
    {
        var memberId = GetMemberId();
        if (memberId is null) return Unauthorized();
        return Ok(await service.GetLobbySessionsAsync(memberId.Value));
    }

    [HttpGet("archived")]
    public async Task<IActionResult> GetArchivedSessions()
    {
        var memberId = GetMemberId();
        if (memberId is null) return Unauthorized();
        return Ok(await service.GetArchivedSessionsAsync(memberId.Value));
    }

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

    [HttpPost("{id:guid}/open")]
    public async Task<IActionResult> Open(Guid id) =>
        await RunSession(m => service.OpenAsync(id, m));

    [HttpPost("{id:guid}/go-live")]
    public async Task<IActionResult> GoLive(Guid id) =>
        await RunSession(m => service.GoLiveAsync(id, m));

    [HttpPut("{id:guid}/squad")]
    public async Task<IActionResult> SetSquad(Guid id, [FromBody] SetSquadRequest req) =>
        await RunSession(m => service.SetSquadAsync(id, m, req.SquadId));

    [HttpPut("{id:guid}/phase")]
    public async Task<IActionResult> SetPhase(Guid id, [FromBody] SetPhaseRequest req) =>
        await RunSession(m => service.SetPhaseAsync(id, m, req.Phase));

    [HttpPost("{id:guid}/close")]
    public async Task<IActionResult> Close(Guid id) =>
        await RunSession(m => service.CloseAsync(id, m));

    [HttpPost("{id:guid}/reopen")]
    public async Task<IActionResult> Reopen(Guid id) =>
        await RunSession(m => service.ReopenAsync(id, m));

    [HttpPost("{id:guid}/archive")]
    public async Task<IActionResult> Archive(Guid id) =>
        await Run(m => service.SetArchivedAsync(id, m, true));

    [HttpPost("{id:guid}/unarchive")]
    public async Task<IActionResult> Unarchive(Guid id) =>
        await Run(m => service.SetArchivedAsync(id, m, false));

    [HttpPatch("{id:guid}/settings")]
    public async Task<IActionResult> UpdateSettings(Guid id, [FromBody] UpdateRetroBoardSettingsRequest req) =>
        await Run(m => service.UpdateSettingsAsync(id, m, req));

    [HttpPost("{id:guid}/reveal")]
    public async Task<IActionResult> Reveal(Guid id, [FromQuery] bool revealed = true) =>
        await Run(m => service.RevealNotesAsync(id, m, revealed));

    [HttpPut("{id:guid}/live-state")]
    public async Task<IActionResult> SetLiveState(Guid id, [FromBody] LiveStateRequest req) =>
        await Run(m => service.SetLiveStateAsync(id, m, req.LiveStateJson));

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
    public async Task<IActionResult> AddColumn(Guid id, [FromBody] RetroColumnInput input) =>
        await RunResource(m => service.AddColumnAsync(id, m, input));

    [HttpPut("{id:guid}/columns/{columnId:guid}")]
    public async Task<IActionResult> UpdateColumn(Guid id, Guid columnId, [FromBody] RetroColumnInput input) =>
        await Run(m => service.UpdateColumnAsync(id, m, columnId, input));

    [HttpDelete("{id:guid}/columns/{columnId:guid}")]
    public async Task<IActionResult> DeleteColumn(Guid id, Guid columnId) =>
        await Run(m => service.DeleteColumnAsync(id, m, columnId));

    // ---------- Notes ----------

    [HttpPost("{id:guid}/notes")]
    public async Task<IActionResult> AddNote(Guid id, [FromBody] AddRetroBoardNoteRequest req) =>
        await RunSession(m => service.AddNoteAsync(id, m, req));

    [HttpPatch("{id:guid}/notes/{noteId:guid}/text")]
    public async Task<IActionResult> UpdateNoteText(Guid id, Guid noteId, [FromBody] NoteTextRequest req) =>
        await Run(m => service.UpdateNoteTextAsync(id, m, noteId, req.Text));

    [HttpDelete("{id:guid}/notes/{noteId:guid}")]
    public async Task<IActionResult> DeleteNote(Guid id, Guid noteId) =>
        await Run(m => service.DeleteNoteAsync(id, m, noteId));

    [HttpPatch("{id:guid}/notes/{noteId:guid}/flag")]
    public async Task<IActionResult> FlagNote(Guid id, Guid noteId, [FromBody] FlagRequest req) =>
        await Run(m => service.FlagNoteAsync(id, m, noteId, req.Flagged));

    [HttpPatch("{id:guid}/notes/{noteId:guid}/clarify")]
    public async Task<IActionResult> ClarifyNote(Guid id, Guid noteId, [FromBody] ClarifyRequest req) =>
        await Run(m => service.ClarifyNoteAsync(id, m, noteId, req.Clarification));

    [HttpPost("{id:guid}/notes/{noteId:guid}/introduced")]
    public async Task<IActionResult> MarkIntroduced(Guid id, Guid noteId, [FromBody] IntroducedRequest req) =>
        await Run(m => service.SetIntroducedAsync(id, m, noteId, req.Introduced));

    // ---------- Votes ----------

    [HttpPost("{id:guid}/notes/{noteId:guid}/vote")]
    public async Task<IActionResult> AddVote(Guid id, Guid noteId)
    {
        var memberId = GetMemberId();
        if (memberId is null) return Unauthorized();
        var (result, error) = await service.AddVoteAsync(id, memberId.Value, noteId);
        return result == RetroActionResult.Ok ? NoContent() : MapResult(result, error);
    }

    [HttpDelete("{id:guid}/notes/{noteId:guid}/vote")]
    public async Task<IActionResult> RemoveVote(Guid id, Guid noteId) =>
        await Run(m => service.RemoveVoteAsync(id, m, noteId));

    // ---------- Check-in ----------

    [HttpPost("{id:guid}/checkin-questions")]
    public async Task<IActionResult> AddCheckinQuestion(Guid id, [FromBody] CheckinQuestionInput input) =>
        await RunResource(m => service.AddCheckinQuestionAsync(id, m, input));

    [HttpDelete("{id:guid}/checkin-questions/{questionId:guid}")]
    public async Task<IActionResult> DeleteCheckinQuestion(Guid id, Guid questionId) =>
        await Run(m => service.DeleteCheckinQuestionAsync(id, m, questionId));

    [HttpPost("{id:guid}/checkin-questions/{questionId:guid}/respond")]
    public async Task<IActionResult> RespondCheckin(Guid id, Guid questionId, [FromBody] CheckinResponseRequest req) =>
        await Run(m => service.RespondCheckinAsync(id, m, questionId, req.Rating));

    // ---------- Feedback ----------

    [HttpPost("{id:guid}/feedback-prompts")]
    public async Task<IActionResult> AddFeedbackPrompt(Guid id, [FromBody] FeedbackPromptInput input) =>
        await RunResource(m => service.AddFeedbackPromptAsync(id, m, input));

    [HttpDelete("{id:guid}/feedback-prompts/{promptId:guid}")]
    public async Task<IActionResult> DeleteFeedbackPrompt(Guid id, Guid promptId) =>
        await Run(m => service.DeleteFeedbackPromptAsync(id, m, promptId));

    [HttpPost("{id:guid}/feedback-prompts/{promptId:guid}/respond")]
    public async Task<IActionResult> RespondFeedback(Guid id, Guid promptId, [FromBody] FeedbackResponseRequest req) =>
        await Run(m => service.RespondFeedbackAsync(id, m, promptId, req.Score, req.Comment));

    // ---------- Actions ----------

    [HttpPost("{id:guid}/actions")]
    public async Task<IActionResult> AddAction(Guid id, [FromBody] AddRetroBoardActionRequest req) =>
        await RunResource(m => service.AddActionAsync(id, m, req));

    [HttpPatch("{id:guid}/actions/{actionId:guid}")]
    public async Task<IActionResult> UpdateAction(Guid id, Guid actionId, [FromBody] UpdateRetroBoardActionRequest req) =>
        await Run(m => service.UpdateActionAsync(id, m, actionId, req));

    [HttpDelete("{id:guid}/actions/{actionId:guid}")]
    public async Task<IActionResult> DeleteAction(Guid id, Guid actionId) =>
        await Run(m => service.DeleteActionAsync(id, m, actionId));

    // ---------- Participants ----------

    [HttpPost("{id:guid}/progress")]
    public async Task<IActionResult> SetProgress(Guid id, [FromBody] ProgressRequest req) =>
        await Run(m => service.SetProgressAsync(id, m, req.Phase, req.Completed));

    [HttpPost("{id:guid}/self-paced")]
    public async Task<IActionResult> SetSelfPaced(Guid id, [FromBody] SelfPacedRequest req) =>
        await Run(m => service.SetSelfPacedAsync(id, m, req.IsSelfPaced));

    [HttpPut("{id:guid}/participants/role")]
    public async Task<IActionResult> SetParticipantRole(Guid id, [FromBody] SetParticipantRoleRequest req) =>
        await Run(m => service.SetParticipantRoleAsync(id, m, req.MemberId, req.Role));

    // ---------- Plumbing ----------

    private Guid? GetMemberId()
    {
        var claim = User.FindFirst("TMID")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }

    /// <summary>Maps a <see cref="RetroActionResult"/> to a consistent HTTP status. This is the single
    /// place the module decides "closed → 409, forbidden → 403, missing → 404", etc.</summary>
    private IActionResult MapResult(RetroActionResult result, string? error = null) => result switch
    {
        RetroActionResult.Ok => NoContent(),
        RetroActionResult.NotFound => NotFound(),
        RetroActionResult.Forbidden => StatusCode(StatusCodes.Status403Forbidden, new { error = error ?? "You don't have access to do that." }),
        RetroActionResult.Closed => Conflict(new { error = error ?? "This retro is closed." }),
        RetroActionResult.Conflict => Conflict(new { error = error ?? "That isn't allowed right now." }),
        RetroActionResult.Invalid => BadRequest(new { error = error ?? "Invalid request." }),
        _ => StatusCode(StatusCodes.Status500InternalServerError),
    };

    /// <summary>Runs a member-scoped mutation returning a plain result (204 on success).</summary>
    private async Task<IActionResult> Run(Func<Guid, Task<RetroActionResult>> action)
    {
        var memberId = GetMemberId();
        if (memberId is null) return Unauthorized();
        return MapResult(await action(memberId.Value));
    }

    /// <summary>Runs a mutation that returns a created/updated resource (200 with body on success).</summary>
    private async Task<IActionResult> RunResource<T>(Func<Guid, Task<(RetroActionResult result, T? value)>> action) where T : class
    {
        var memberId = GetMemberId();
        if (memberId is null) return Unauthorized();
        var (result, value) = await action(memberId.Value);
        return result == RetroActionResult.Ok ? Ok(value) : MapResult(result);
    }

    /// <summary>Runs a mutation that returns the full session snapshot (200 with body on success).</summary>
    private async Task<IActionResult> RunSession(Func<Guid, Task<(RetroActionResult result, RetroBoardSessionDto? session)>> action)
    {
        var memberId = GetMemberId();
        if (memberId is null) return Unauthorized();
        var (result, session) = await action(memberId.Value);
        return result == RetroActionResult.Ok ? Ok(session) : MapResult(result);
    }

    /// <summary>Legacy bool guard, retained for the creator-only delete (404 hides existence).</summary>
    private async Task<IActionResult> Guard(Func<Guid, Task<bool>> action)
    {
        var memberId = GetMemberId();
        if (memberId is null) return Unauthorized();
        return await action(memberId.Value) ? NoContent() : NotFound();
    }
}
