using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.WinOfTheWeek;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/win-of-the-week")]
public class WinOfTheWeekController(IWinOfTheWeekService service) : ControllerBase
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
    public async Task<IActionResult> CloseWeek([FromBody] CloseWeekRequest request)
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.CloseWeekAsync(memberId, request);
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

    private Guid GetCurrentMemberId()
    {
        var nameIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (Guid.TryParse(nameIdClaim, out var memberId))
            return memberId;

        return Guid.Empty;
    }
}
