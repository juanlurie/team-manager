using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.WinOfTheWeek;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/win-of-the-week")]
public class WinOfTheWeekController(IWinOfTheWeekService service, AppDbContext db) : ControllerBase
{
    [HttpGet("current")]
    public async Task<IActionResult> GetCurrent()
    {
        var memberId = GetCurrentMemberId();
        var result = await service.GetCurrentWeekAsync(memberId);
        return Ok(result);
    }

    [HttpPost("nominations")]
    public async Task<IActionResult> CreateNomination([FromBody] CreateNominationRequest request)
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.CreateNominationAsync(memberId, request);
            return Ok(result);
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
            _ = WebSocketMiddleware.BroadcastAsync("vote_cast", new { nominationId, voterId = memberId, voteCount = result?.GetType().GetProperty("VoteCount")?.GetValue(result) });
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
        if (success)
            _ = WebSocketMiddleware.BroadcastAsync("vote_removed", new { nominationId, voterId = memberId });
        return success ? NoContent() : NotFound();
    }

    [HttpPost("close")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> CloseWeek([FromBody] CloseWeekRequest request)
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.CloseWeekAsync(memberId, request);
            _ = WebSocketMiddleware.BroadcastAsync("voting_closed", new { weekId = result?.GetType().GetProperty("Id")?.GetValue(result), winnerId = request.WinnerNominationId });
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
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> OpenNextWeek()
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.OpenNextWeekAsync(memberId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("open-voting")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> OpenVoting()
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.OpenVotingAsync(memberId);
            _ = WebSocketMiddleware.BroadcastAsync("voting_opened", new { });
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] int? year = null, [FromQuery] int limit = 52)
    {
        var result = await service.GetHistoryAsync(year, limit);
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

    private Guid GetCurrentMemberId()
    {
        var nameIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (Guid.TryParse(nameIdClaim, out var memberId))
            return memberId;

        var firstMember = db.Set<Domain.Entities.TeamMember>()
            .Where(m => m.IsActive)
            .OrderBy(m => m.CreatedAt)
            .Select(m => (Guid?)m.Id)
            .FirstOrDefault();

        return firstMember ?? Guid.Empty;
    }
}
