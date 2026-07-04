using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.FunRetro;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Middleware;
using TeamManager.Api.Application.DTOs.Poll;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("retro")]
[Route("api/v1/fun-retro")]
public class FunRetroController(FunRetroService service, PollService pollService) : ControllerBase
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

    [HttpGet("{id}")]
    public async Task<IActionResult> GetSession(string id)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var sessionId = await service.ResolveSessionIdAsync(id);
        if (sessionId is null) return NotFound();

        var session = await service.GetSessionAsync(sessionId.Value, memberId.Value);
        if (session is null) return NotFound();
        return Ok(session);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteSession(Guid id)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var success = await service.DeleteSessionAsync(id, memberId.Value);
        if (!success) return NotFound();
        return NoContent();
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

    [HttpGet("{id:guid}/cards/{cardId:guid}/comments")]
    public async Task<IActionResult> GetCardComments(Guid id, Guid cardId)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();
        return Ok(await service.GetCardCommentsAsync(id, cardId));
    }

    [HttpPost("{id:guid}/cards/{cardId:guid}/comments")]
    public async Task<IActionResult> AddCardComment(Guid id, Guid cardId, [FromBody] AddFunRetroCardCommentRequest request)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();
        var comment = await service.AddCardCommentAsync(id, cardId, memberId.Value, request.Text);
        if (comment is null) return BadRequest();
        return Ok(comment);
    }

    [HttpDelete("{id:guid}/cards/{cardId:guid}/comments/{commentId:guid}")]
    public async Task<IActionResult> DeleteCardComment(Guid id, Guid cardId, Guid commentId)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();
        var success = await service.DeleteCardCommentAsync(id, cardId, commentId, memberId.Value);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPatch("{id:guid}/cards/{cardId:guid}/text")]
    public async Task<IActionResult> UpdateCardText(Guid id, Guid cardId, [FromBody] CardTextRequest request)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var success = await service.UpdateCardTextAsync(id, cardId, memberId.Value, request.Text);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPatch("{id:guid}/cards/{cardId:guid}/color")]
    public async Task<IActionResult> UpdateCardColor(Guid id, Guid cardId, [FromBody] CardColorRequest request)
    {
        var success = await service.UpdateCardColorAsync(id, cardId, request.Color);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPatch("{id:guid}/cards/{cardId:guid}/group")]
    public async Task<IActionResult> SetCardGroup(Guid id, Guid cardId, [FromBody] CardGroupRequest request)
    {
        var success = await service.SetCardGroupAsync(id, cardId, request.GroupId);
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

    [HttpPost("{id:guid}/tokens")]
    public async Task<IActionResult> AddToken(Guid id, [FromBody] AddFunRetroTokenRequest request)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();
        var token = await service.AddTokenAsync(id, memberId.Value, request.Column, request.Emoji, request.Size, request.PositionX, request.PositionY);
        if (token is null) return BadRequest();
        return Ok(token);
    }

    [HttpPatch("{id:guid}/tokens/{tokenId:guid}/position")]
    public async Task<IActionResult> UpdateTokenPosition(Guid id, Guid tokenId, [FromBody] UpdateFunRetroTokenPositionRequest request)
    {
        var success = await service.UpdateTokenPositionAsync(id, tokenId, request.PositionX, request.PositionY);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPatch("{id:guid}/tokens/{tokenId:guid}/size")]
    public async Task<IActionResult> UpdateTokenSize(Guid id, Guid tokenId, [FromBody] UpdateFunRetroTokenSizeRequest request)
    {
        var success = await service.UpdateTokenSizeAsync(id, tokenId, request.Size);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpDelete("{id:guid}/tokens/{tokenId:guid}")]
    public async Task<IActionResult> DeleteToken(Guid id, Guid tokenId)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();
        var success = await service.DeleteTokenAsync(id, tokenId, memberId.Value);
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

    [HttpPatch("{id:guid}/settings")]
    public async Task<IActionResult> UpdateSettings(Guid id, [FromBody] UpdateRetroSettingsRequest request)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var success = await service.UpdateSettingsAsync(id, memberId.Value, request.HideCardsOnAdd, request.ParticipationTracking, request.Theme);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPost("{id:guid}/reveal-now")]
    public async Task<IActionResult> RevealAllNow(Guid id)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var success = await service.RevealAllNowAsync(id, memberId.Value);
        if (!success) return NotFound();
        return NoContent();
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

    [HttpGet("{id:guid}/polls")]
    public async Task<IActionResult> GetPolls(Guid id)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();
        var polls = await pollService.GetRetroSessionPollsAsync(id, memberId.Value);
        return Ok(polls);
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
public record CardGroupRequest(Guid? GroupId);
public record CardTextRequest(string Text);
