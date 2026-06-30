using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.WinOfTheWeek;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/v1/guest/wow")]
public class GuestWinOfTheWeekController(GuestWinOfTheWeekService service) : ControllerBase
{
    [HttpGet("{token}")]
    public async Task<IActionResult> GetWeek(string token, [FromQuery] string sessionId = "")
    {
        try
        {
            var result = await service.GetWeekByTokenAsync(token, sessionId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpGet("{token}/members")]
    public async Task<IActionResult> GetMembers(string token)
    {
        try
        {
            var result = await service.GetMembersAsync(token);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpPost("{token}/nominations")]
    public async Task<IActionResult> CreateNomination(string token, [FromBody] GuestCreateNominationRequest request)
    {
        try
        {
            var result = await service.CreateGuestNominationAsync(token, request);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{token}/nominations/{nominationId:guid}")]
    public async Task<IActionResult> UpdateNomination(string token, Guid nominationId, [FromQuery] string sessionId, [FromBody] GuestUpdateNominationRequest request)
    {
        try
        {
            var result = await service.UpdateGuestNominationAsync(token, nominationId, sessionId, request);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{token}/nominations/{nominationId:guid}")]
    public async Task<IActionResult> DeleteNomination(string token, Guid nominationId, [FromQuery] string sessionId)
    {
        try
        {
            await service.DeleteGuestNominationAsync(token, nominationId, sessionId);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{token}/nominations/{nominationId:guid}/vote")]
    public async Task<IActionResult> Vote(string token, Guid nominationId, [FromQuery] string sessionId)
    {
        try
        {
            var result = await service.VoteAsync(token, nominationId, sessionId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{token}/nominations/{nominationId:guid}/vote")]
    public async Task<IActionResult> RemoveVote(string token, Guid nominationId, [FromQuery] string sessionId)
    {
        try
        {
            var success = await service.RemoveVoteAsync(token, nominationId, sessionId);
            return success ? NoContent() : NotFound();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpPost("{token}/nominations/{nominationId:guid}/powerup")]
    public async Task<IActionResult> ApplyPowerUp(string token, Guid nominationId, [FromQuery] string sessionId, [FromBody] ApplyWowCardRequest request)
    {
        try
        {
            var result = await service.ApplyGuestPowerUpAsync(token, nominationId, sessionId, request.Type);
            _ = WebSocketMiddleware.BroadcastAsync("nomination_updated", new { nomination = result }, guestAllowed: true);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("{token}/nominations/{nominationId:guid}/chaoscard")]
    public async Task<IActionResult> ApplyChaosCard(string token, Guid nominationId, [FromQuery] string sessionId, [FromBody] ApplyWowCardRequest request)
    {
        try
        {
            var result = await service.ApplyGuestChaosCardAsync(token, nominationId, sessionId, request.Type);
            _ = WebSocketMiddleware.BroadcastAsync("nomination_updated", new { nomination = result }, guestAllowed: true);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("{token}/nominations/{nominationId:guid}/hype")]
    public async Task<IActionResult> IncrementHypeMeter(string token, Guid nominationId)
    {
        try
        {
            var count = await service.IncrementGuestHypeMeterAsync(token, nominationId);
            _ = WebSocketMiddleware.BroadcastAsync("hype_meter_tapped", new { nominationId, count }, guestAllowed: true);
            return Ok(new { count });
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }
}
