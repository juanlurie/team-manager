using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.WinOfTheWeek;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("win-of-week")]
[Route("api/v1/win-of-the-week")]
public class WinOfTheWeekController(IWinOfTheWeekService service, WinSeriesService seriesService, AppDbContext db, GuestWinOfTheWeekService guestService) : ControllerBase
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
        var week = await db.WinWeeks
            .Where(w => w.WinSeriesId == sid && w.Status != WinWeekStatus.Closed)
            .OrderByDescending(w => w.WeekStart)
            .Select(w => new { w.GuestToken })
            .FirstOrDefaultAsync();

        var endsAt = DateTimeOffset.UtcNow.AddSeconds(request.DurationSeconds);
        if (week?.GuestToken is { } token)
            _ = WebSocketMiddleware.BroadcastToSessionAsync("wow_timer_started", token, new { endsAt });
        else
            _ = WebSocketMiddleware.BroadcastAsync("wow_timer_started", new { endsAt }, guestAllowed: true);

        return Ok(new { endsAt });
    }

    [HttpPost("timer/stop")]
    [RequireFeature("wow-host")]
    public async Task<IActionResult> StopTimer([FromQuery] Guid? seriesId = null)
    {
        var sid = await ResolveSeriesIdAsync(seriesId);
        var week = await db.WinWeeks
            .Where(w => w.WinSeriesId == sid && w.Status != WinWeekStatus.Closed)
            .OrderByDescending(w => w.WeekStart)
            .Select(w => new { w.GuestToken })
            .FirstOrDefaultAsync();

        if (week?.GuestToken is { } token)
            _ = WebSocketMiddleware.BroadcastToSessionAsync("wow_timer_stopped", token, new { });
        else
            _ = WebSocketMiddleware.BroadcastAsync("wow_timer_stopped", new { }, guestAllowed: true);

        return Ok();
    }

    [HttpPost("hype-battle/start")]
    [RequireFeature("wow-host")]
    public async Task<IActionResult> StartHypeBattle([FromBody] WowTimerRequest request, [FromQuery] Guid? seriesId = null)
    {
        var sid = await ResolveSeriesIdAsync(seriesId);
        var week = await db.WinWeeks
            .Where(w => w.WinSeriesId == sid && w.Status != WinWeekStatus.Closed)
            .OrderByDescending(w => w.WeekStart)
            .FirstOrDefaultAsync();

        if (week?.QuizQuestion is not null)
            return BadRequest(new { error = "Stop Quiz Duel before starting Hype Battle." });

        var endsAt = DateTimeOffset.UtcNow.AddSeconds(request.DurationSeconds);
        if (week is not null)
        {
            week.HypeBattleEndsAt = endsAt;
            // Always start fresh -- clear any taps left over from a previous battle this week.
            await db.WinNominations
                .Where(n => n.WinWeekId == week.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(n => n.HypeMeterCount, 0));
            await db.SaveChangesAsync();
        }

        if (week?.GuestToken is { } token)
            _ = WebSocketMiddleware.BroadcastToSessionAsync("wow_hype_battle_started", token, new { endsAt });
        else
            _ = WebSocketMiddleware.BroadcastAsync("wow_hype_battle_started", new { endsAt }, guestAllowed: true);

        return Ok(new { endsAt });
    }

    [HttpPost("hype-battle/end")]
    [RequireFeature("wow-host")]
    public async Task<IActionResult> EndHypeBattle([FromQuery] Guid? seriesId = null)
    {
        var sid = await ResolveSeriesIdAsync(seriesId);
        var week = await db.WinWeeks
            .Where(w => w.WinSeriesId == sid && w.Status != WinWeekStatus.Closed)
            .OrderByDescending(w => w.WeekStart)
            .FirstOrDefaultAsync();

        // Manual stop just ends the mini-game -- no auto-resolve, unlike letting the timer run out.
        if (week is not null)
        {
            week.HypeBattleEndsAt = null;
            await db.SaveChangesAsync();
        }

        if (week?.GuestToken is { } token)
            _ = WebSocketMiddleware.BroadcastToSessionAsync("wow_hype_battle_ended", token, new { });
        else
            _ = WebSocketMiddleware.BroadcastAsync("wow_hype_battle_ended", new { }, guestAllowed: true);

        return Ok();
    }

    [HttpGet("quiz/eligible")]
    [RequireFeature("wow-host")]
    public async Task<IActionResult> IsQuizEligible([FromQuery] Guid? seriesId = null)
    {
        var sid = await ResolveSeriesIdAsync(seriesId);
        var week = await db.WinWeeks
            .Where(w => w.WinSeriesId == sid && w.Status != WinWeekStatus.Closed)
            .OrderByDescending(w => w.WeekStart)
            .FirstOrDefaultAsync();

        var eligible = week is not null && await service.IsQuizEligibleAsync(week.Id);
        return Ok(new { eligible });
    }

    [HttpPost("quiz/start")]
    [RequireFeature("wow-host")]
    public async Task<IActionResult> StartQuiz([FromQuery] Guid? seriesId = null, [FromQuery] int? difficultyLevel = null)
    {
        var memberId = GetCurrentMemberId();
        var sid = await ResolveSeriesIdAsync(seriesId);
        var week = await db.WinWeeks
            .Where(w => w.WinSeriesId == sid && w.Status != WinWeekStatus.Closed)
            .OrderByDescending(w => w.WeekStart)
            .FirstOrDefaultAsync();
        if (week is null) return NotFound(new { error = "No active week found." });

        try
        {
            var result = await service.StartQuizAsync(memberId, week.Id, difficultyLevel);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("quiz/answer")]
    public async Task<IActionResult> SubmitQuizAnswer([FromBody] SubmitQuizAnswerRequest request, [FromQuery] Guid? seriesId = null)
    {
        var memberId = GetCurrentMemberId();
        var sid = await ResolveSeriesIdAsync(seriesId);
        var week = await db.WinWeeks
            .Where(w => w.WinSeriesId == sid && w.Status != WinWeekStatus.Closed)
            .OrderByDescending(w => w.WeekStart)
            .FirstOrDefaultAsync();
        if (week is null) return NotFound(new { error = "No active week found." });

        try
        {
            var isCorrect = await service.SubmitQuizAnswerAsync(memberId, week.Id, request.SelectedIndex);
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
        var sid = await ResolveSeriesIdAsync(seriesId);
        var week = await db.WinWeeks
            .Where(w => w.WinSeriesId == sid && w.Status != WinWeekStatus.Closed)
            .OrderByDescending(w => w.WeekStart)
            .FirstOrDefaultAsync();
        if (week is null) return NotFound(new { error = "No active week found." });

        try
        {
            var result = await service.CompleteQuizWinnerAsync(memberId, week.Id);
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
        var sid = await ResolveSeriesIdAsync(seriesId);
        var week = await db.WinWeeks
            .Where(w => w.WinSeriesId == sid && w.Status != WinWeekStatus.Closed)
            .OrderByDescending(w => w.WeekStart)
            .FirstOrDefaultAsync();
        if (week is null) return NotFound(new { error = "No active week found." });

        try
        {
            var result = await service.StopQuizAsync(memberId, week.Id);
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

    private async Task<Guid> ResolveSeriesIdAsync(Guid? seriesId)
    {
        if (seriesId.HasValue && seriesId.Value != Guid.Empty)
            return seriesId.Value;

        var first = await db.WinSeries.OrderBy(s => s.CreatedAt).Select(s => (Guid?)s.Id).FirstOrDefaultAsync();
        return first ?? Guid.Empty;
    }

    private Guid GetCurrentMemberId()
    {
        if (Guid.TryParse(User.FindFirst("TMID")?.Value, out var tmid))
            return tmid;

        if (Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var nameId))
            return nameId;

        var firstMember = db.Set<Domain.Entities.TeamMember>()
            .Where(m => m.IsActive)
            .OrderBy(m => m.CreatedAt)
            .Select(m => (Guid?)m.Id)
            .FirstOrDefault();

        return firstMember ?? Guid.Empty;
    }
}
