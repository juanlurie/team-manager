using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.WinOfTheWeek;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("win-of-week")]
[Route("api/v1/win-of-the-week")]
public class WinOfTheWeekController(IWinOfTheWeekService service, WinSeriesService seriesService, GuestWinOfTheWeekService guestService) : ControllerBase
{
    [HttpGet("current")]
    public async Task<IActionResult> GetCurrent([FromQuery] Guid? seriesId = null)
    {
        var memberId = GetCurrentMemberId();
        var sid = await ResolveSeriesIdAsync(seriesId);
        if (sid == Guid.Empty) return NotFound(new { error = "No series found. Create one first." });
        var result = await service.GetCurrentWeekAsync(memberId, sid);
        return Ok(result);
    }

    [HttpPost("nominations")]
    public async Task<IActionResult> CreateNomination([FromBody] CreateNominationRequest request, [FromQuery] Guid? seriesId = null)
    {
        var memberId = GetCurrentMemberId();
        var sid = await ResolveSeriesIdAsync(seriesId);
        try
        {
            var result = await service.CreateNominationAsync(memberId, request, sid);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("nominations/{nominationId:guid}")]
    public async Task<IActionResult> UpdateNomination(Guid nominationId, [FromBody] CreateNominationRequest request)
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.UpdateNominationAsync(memberId, nominationId, request);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = "Nomination not found." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("nominations/{nominationId:guid}")]
    public async Task<IActionResult> DeleteNomination(Guid nominationId)
    {
        var memberId = GetCurrentMemberId();
        try
        {
            await service.DeleteNominationAsync(memberId, nominationId);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = "Nomination not found." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("nominations/{nominationId:guid}/vote")]
    public async Task<IActionResult> Vote(Guid nominationId)
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.VoteAsync(memberId, nominationId);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = "Nomination not found." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("nominations/{nominationId:guid}/vote")]
    public async Task<IActionResult> RemoveVote(Guid nominationId)
    {
        var memberId = GetCurrentMemberId();
        var success = await service.RemoveVoteAsync(memberId, nominationId);
        return success ? NoContent() : NotFound();
    }

    [HttpPost("close")]
    [RequireFeature("wow-host")]
    public async Task<IActionResult> CloseWeek([FromBody] CloseWeekRequest request, [FromQuery] Guid? seriesId = null)
    {
        var memberId = GetCurrentMemberId();
        var sid = await ResolveSeriesIdAsync(seriesId);
        try
        {
            // voting_closed is broadcast by CloseWeekWithWinnerAsync, which CloseWeekAsync delegates to.
            var result = await service.CloseWeekAsync(memberId, sid, request);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = "Specified nomination not found in current week." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("open-next")]
    [RequireFeature("wow-host")]
    public async Task<IActionResult> OpenNextWeek([FromQuery] Guid? seriesId = null)
    {
        var memberId = GetCurrentMemberId();
        var sid = await ResolveSeriesIdAsync(seriesId);
        if (sid == Guid.Empty) return NotFound(new { error = "No series found. Create one first." });
        try
        {
            var result = await service.OpenNextWeekAsync(memberId, sid);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("open-voting")]
    [RequireFeature("wow-host")]
    public async Task<IActionResult> OpenVoting([FromQuery] Guid? seriesId = null)
    {
        var memberId = GetCurrentMemberId();
        var sid = await ResolveSeriesIdAsync(seriesId);
        try
        {
            var result = await service.OpenVotingAsync(memberId, sid);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("reopen-nominations")]
    [RequireFeature("wow-host")]
    public async Task<IActionResult> ReopenNominations([FromQuery] Guid? seriesId = null)
    {
        var memberId = GetCurrentMemberId();
        var sid = await ResolveSeriesIdAsync(seriesId);
        try
        {
            var result = await service.ReopenNominationsAsync(memberId, sid);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("sudden-death")]
    [RequireFeature("wow-host")]
    public async Task<IActionResult> StartSuddenDeath([FromBody] StartSuddenDeathRequest request, [FromQuery] Guid? seriesId = null)
    {
        var memberId = GetCurrentMemberId();
        var sid = await ResolveSeriesIdAsync(seriesId);
        try
        {
            var result = await service.StartSuddenDeathAsync(memberId, sid, request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{weekId:guid}/guest-token")]
    [RequireFeature("wow-host")]
    public async Task<IActionResult> GenerateGuestToken(Guid weekId)
    {
        try
        {
            var result = await guestService.GetOrGenerateGuestTokenAsync(weekId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpGet("tokens")]
    public async Task<IActionResult> GetTokenBalance([FromQuery] Guid? seriesId = null)
    {
        var memberId = GetCurrentMemberId();
        var sid = await ResolveSeriesIdAsync(seriesId);
        if (sid == Guid.Empty) return Ok(new { balance = 0 });
        var balance = await service.GetTokenBalanceAsync(memberId, sid);
        return Ok(new { balance });
    }

    [HttpPost("nominations/{nominationId:guid}/powerup")]
    public async Task<IActionResult> ApplyPowerUp(Guid nominationId, [FromBody] ApplyWowCardRequest request)
    {
        var memberId = GetCurrentMemberId();

        try
        {
            var result = await service.ApplyPowerUpAsync(memberId, nominationId, request.Type);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("nominations/{nominationId:guid}/chaoscard")]
    public async Task<IActionResult> ApplyChaosCard(Guid nominationId, [FromBody] ApplyWowCardRequest request)
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.ApplyChaosCardAsync(memberId, nominationId, request.Type);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("nominations/{nominationId:guid}/hype")]
    public async Task<IActionResult> IncrementHypeMeter(Guid nominationId)
    {
        try
        {
            var count = await service.IncrementHypeMeterAsync(nominationId);
            return Ok(new { count });
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    private static readonly HashSet<string> ValidReactionEmojis = ["😂", "🔥", "👏", "❤️", "😮"];

    // Purely cosmetic, no persistence -- members and guests share this one endpoint.
    [HttpPost("nominations/react")]
    [AllowAnonymous]
    public IActionResult SendReaction([FromBody] SendReactionRequest request)
    {
        if (!ValidReactionEmojis.Contains(request.Emoji))
            return BadRequest(new { error = "Invalid reaction emoji." });

        _ = WebSocketMiddleware.BroadcastAsync("reaction_sent", new
        {
            nominationId = request.NominationId,
            emoji = request.Emoji,
            id = Guid.NewGuid()
        }, guestAllowed: true);

        return Ok();
    }

    [HttpPost("timer/start")]
    [RequireFeature("wow-host")]
    public async Task<IActionResult> StartTimer([FromBody] WowTimerRequest request, [FromQuery] Guid? seriesId = null)
    {
        var sid = await ResolveSeriesIdAsync(seriesId);
        var endsAt = await service.StartTimerAsync(sid, request.DurationSeconds);
        return Ok(new { endsAt });
    }

    [HttpPost("timer/stop")]
    [RequireFeature("wow-host")]
    public async Task<IActionResult> StopTimer([FromQuery] Guid? seriesId = null)
    {
        var sid = await ResolveSeriesIdAsync(seriesId);
        await service.StopTimerAsync(sid);
        return Ok();
    }

    [HttpPost("hype-battle/start")]
    [RequireFeature("wow-host")]
    public async Task<IActionResult> StartHypeBattle([FromBody] WowTimerRequest request, [FromQuery] Guid? seriesId = null)
    {
        var sid = await ResolveSeriesIdAsync(seriesId);
        try
        {
            var endsAt = await service.StartHypeBattleAsync(sid, request.DurationSeconds);
            return Ok(new { endsAt });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("hype-battle/end")]
    [RequireFeature("wow-host")]
    public async Task<IActionResult> EndHypeBattle([FromQuery] Guid? seriesId = null)
    {
        var sid = await ResolveSeriesIdAsync(seriesId);
        await service.EndHypeBattleAsync(sid);
        return Ok();
    }

    [HttpGet("quiz/eligible")]
    [RequireFeature("wow-host")]
    public async Task<IActionResult> IsQuizEligible([FromQuery] Guid? seriesId = null)
    {
        var weekId = await ResolveActiveWeekIdAsync(seriesId);
        var eligible = weekId is not null && await service.IsQuizEligibleAsync(weekId.Value);
        return Ok(new { eligible });
    }

    [HttpPost("quiz/start")]
    [RequireFeature("wow-host")]
    public async Task<IActionResult> StartQuiz([FromQuery] Guid? seriesId = null, [FromQuery] int? difficultyLevel = null)
    {
        var memberId = GetCurrentMemberId();
        var weekId = await ResolveActiveWeekIdAsync(seriesId);
        if (weekId is null) return NotFound(new { error = "No active week found." });

        try
        {
            var result = await service.StartQuizAsync(memberId, weekId.Value, difficultyLevel);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("quiz/answer")]
    public async Task<IActionResult> SubmitQuizAnswer([FromBody] SubmitQuizAnswerRequest request, [FromQuery] Guid? seriesId = null)
    {
        var memberId = GetCurrentMemberId();
        var weekId = await ResolveActiveWeekIdAsync(seriesId);
        if (weekId is null) return NotFound(new { error = "No active week found." });

        try
        {
            var isCorrect = await service.SubmitQuizAnswerAsync(memberId, weekId.Value, request.SelectedIndex);
            return Ok(new { isCorrect });
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("quiz/complete")]
    [RequireFeature("wow-host")]
    public async Task<IActionResult> CompleteQuizWinner([FromQuery] Guid? seriesId = null)
    {
        var memberId = GetCurrentMemberId();
        var weekId = await ResolveActiveWeekIdAsync(seriesId);
        if (weekId is null) return NotFound(new { error = "No active week found." });

        try
        {
            var result = await service.CompleteQuizWinnerAsync(memberId, weekId.Value);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("quiz/stop")]
    [RequireFeature("wow-host")]
    public async Task<IActionResult> StopQuiz([FromQuery] Guid? seriesId = null)
    {
        var memberId = GetCurrentMemberId();
        var weekId = await ResolveActiveWeekIdAsync(seriesId);
        if (weekId is null) return NotFound(new { error = "No active week found." });

        try
        {
            var result = await service.StopQuizAsync(memberId, weekId.Value);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] Guid? seriesId = null, [FromQuery] int? year = null, [FromQuery] int limit = 52)
    {
        var sid = await ResolveSeriesIdAsync(seriesId);
        var result = await service.GetHistoryAsync(sid, year, limit);
        return Ok(result);
    }

    [HttpGet("weeks/{weekId:guid}")]
    public async Task<IActionResult> GetWeekDetail(Guid weekId)
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.GetWeekDetailAsync(weekId, memberId);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = "Week not found." });
        }
    }

    private Task<Guid> ResolveSeriesIdAsync(Guid? seriesId) => seriesService.ResolveSeriesIdAsync(seriesId);

    // Resolve the series (given or default), then its active non-closed week. Null when either is
    // missing — the quiz/tiebreaker endpoints all need a live week to act on.
    private async Task<Guid?> ResolveActiveWeekIdAsync(Guid? seriesId)
    {
        var sid = await ResolveSeriesIdAsync(seriesId);
        return sid == Guid.Empty ? null : await service.GetActiveWeekIdAsync(sid);
    }

    // Single source of truth for the caller's member id (TMID/NameIdentifier claim). No fallback:
    // the class-level [RequireFeature] fails closed on Guid.Empty, so no action body runs without a
    // resolved member — we never silently impersonate the oldest member.
    private Guid GetCurrentMemberId() => HttpContext.GetCurrentMemberId();
}
