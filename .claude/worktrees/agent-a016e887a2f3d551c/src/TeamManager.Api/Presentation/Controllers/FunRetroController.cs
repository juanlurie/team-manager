using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.FunRetro;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("retro")]
[Route("api/v1/fun-retro")]
public class FunRetroController(FunRetroService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetOpenSessions()
    {
        return Ok(await service.GetOpenSessionsAsync());
    }

    [HttpPost]
    public async Task<IActionResult> CreateSession([FromBody] CreateFunRetroSessionRequest request)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var session = await service.CreateSessionAsync(memberId.Value, request);
        return CreatedAtAction(nameof(GetSession), new { id = session.Id }, session);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetSession(Guid id)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var session = await service.GetSessionAsync(id, memberId.Value);
        if (session is null) return NotFound();
        return Ok(session);
    }

    [HttpPost("{id:guid}/cards")]
    public async Task<IActionResult> AddCard(Guid id, [FromBody] AddFunRetroCardRequest request)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var session = await service.AddCardAsync(id, memberId.Value, request);
        if (session is null) return NotFound();
        return Ok(session);
    }

    [HttpDelete("{id:guid}/cards/{cardId:guid}")]
    public async Task<IActionResult> DeleteCard(Guid id, Guid cardId)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var success = await service.DeleteCardAsync(id, cardId, memberId.Value);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPut("{id:guid}/phase")]
    public async Task<IActionResult> SetPhase(Guid id, [FromBody] SetPhaseRequest request)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var session = await service.SetPhaseAsync(id, memberId.Value, request.Phase);
        if (session is null) return NotFound();
        return Ok(session);
    }

    [HttpPost("{id:guid}/cards/{cardId:guid}/vote")]
    public async Task<IActionResult> ToggleVote(Guid id, Guid cardId)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var (success, error) = await service.ToggleVoteAsync(id, cardId, memberId.Value);
        if (!success) return Conflict(new { error });
        return Ok();
    }

    [HttpPost("{id:guid}/cards/{cardId:guid}/react")]
    public async Task<IActionResult> ToggleReaction(Guid id, Guid cardId, [FromBody] ReactRequest request)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var success = await service.ToggleReactionAsync(id, cardId, memberId.Value, request.Emoji);
        if (!success) return NotFound();
        return Ok();
    }

    [HttpPatch("{id:guid}/cards/{cardId:guid}/color")]
    public async Task<IActionResult> UpdateCardColor(Guid id, Guid cardId, [FromBody] CardColorRequest request)
    {
        var success = await service.UpdateCardColorAsync(id, cardId, request.Color);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPatch("{id:guid}/cards/{cardId:guid}/position")]
    public async Task<IActionResult> UpdateCardPosition(Guid id, Guid cardId, [FromBody] CardPositionRequest request)
    {
        var success = await service.UpdateCardPositionAsync(id, cardId, request.X, request.Y);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPost("{id:guid}/analyse")]
    public async Task<IActionResult> Analyse(Guid id)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var (success, error, analysis) = await service.AnalyseAsync(id, memberId.Value);
        if (!success) return BadRequest(new { error });
        return Ok(analysis);
    }

    [HttpPost("{id:guid}/timer")]
    public async Task<IActionResult> SetTimer(Guid id, [FromBody] TimerRequest request)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var timerJson = System.Text.Json.JsonSerializer.Serialize(request,
            new System.Text.Json.JsonSerializerOptions { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase });
        var success = await service.SetTimerAsync(id, memberId.Value, timerJson);
        if (!success) return NotFound();
        return Ok(new { timerJson });
    }

    [HttpGet("{id:guid}/previous-actions")]
    public async Task<IActionResult> GetPreviousActions(Guid id)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var actions = await service.GetPreviousActionsAsync(id);
        return Ok(actions);
    }

    [HttpPost("{id:guid}/icebreaker-answer")]
    public async Task<IActionResult> SubmitIcebreakerAnswer(Guid id, [FromBody] IcebreakerAnswerRequest request)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var (success, answers) = await service.SubmitIcebreakerAnswerAsync(id, memberId.Value, request.Answer);
        if (!success) return NotFound();
        return Ok(answers);
    }

    private Guid? GetCurrentMemberId()
    {
        var claim = User.FindFirst("TMID")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}

public record SetPhaseRequest(string Phase);
public record ReactRequest(string Emoji);
public record CardPositionRequest(double X, double Y);
public record CardColorRequest(string? Color);
public record TimerRequest(int TotalSeconds, DateTimeOffset? StartedAt, DateTimeOffset? PausedAt, double ElapsedBeforePause);
public record IcebreakerAnswerRequest(string Answer);
