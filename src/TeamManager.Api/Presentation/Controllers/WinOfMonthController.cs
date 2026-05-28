using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("win-of-week")]
[Route("api/v1/win-of-the-month")]
public class WinOfMonthController(IWinOfMonthService service, AppDbContext db) : ControllerBase
{
    [HttpGet("current")]
    public async Task<IActionResult> GetCurrent()
    {
        var memberId = GetCurrentMemberId();
        var result = await service.GetCurrentMonthAsync(memberId);
        return result is null ? Ok((object?)null) : Ok(result);
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] int? year = null)
    {
        var result = await service.GetHistoryAsync(year);
        return Ok(result);
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
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> CloseMonth()
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.CloseMonthAsync(memberId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("generate")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Generate()
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.GenerateFromClosedWeeksAsync(memberId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("open")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> OpenVoting()
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.OpenVotingAsync(memberId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
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
