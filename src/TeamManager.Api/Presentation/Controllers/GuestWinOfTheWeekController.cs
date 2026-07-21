using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.WinOfTheWeek;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/v1/guest/wow")]
public class GuestWinOfTheWeekController(GuestWinOfTheWeekService service, GuestSessionManager sessions) : ControllerBase
{
    // The guest's session id is server-issued and read from a signed httpOnly cookie, never trusted
    // from the request — see GuestSessionManager. GET is the natural place the cookie gets minted
    // (the UI always loads the week before it can vote/nominate).
    [HttpGet("{token}")]
    public async Task<IActionResult> GetWeek(string token)
    {
        var sessionId = sessions.GetOrIssue(HttpContext, GuestSessionScope.Wow);
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
        var sessionId = sessions.GetOrIssue(HttpContext, GuestSessionScope.Wow);
        try
        {
            var result = await service.CreateGuestNominationAsync(token, sessionId, request);
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
    public async Task<IActionResult> UpdateNomination(string token, Guid nominationId, [FromBody] GuestUpdateNominationRequest request)
    {
        var sessionId = sessions.GetOrIssue(HttpContext, GuestSessionScope.Wow);
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
    public async Task<IActionResult> DeleteNomination(string token, Guid nominationId)
    {
        var sessionId = sessions.GetOrIssue(HttpContext, GuestSessionScope.Wow);
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
    public async Task<IActionResult> Vote(string token, Guid nominationId)
    {
        var sessionId = sessions.GetOrIssue(HttpContext, GuestSessionScope.Wow);
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
    public async Task<IActionResult> RemoveVote(string token, Guid nominationId)
    {
        var sessionId = sessions.GetOrIssue(HttpContext, GuestSessionScope.Wow);
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
    public async Task<IActionResult> ApplyPowerUp(string token, Guid nominationId, [FromBody] ApplyWowCardRequest request)
    {
        var sessionId = sessions.GetOrIssue(HttpContext, GuestSessionScope.Wow);
        try
        {
            var result = await service.ApplyGuestPowerUpAsync(token, nominationId, sessionId, request.Type);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("{token}/nominations/{nominationId:guid}/chaoscard")]
    public async Task<IActionResult> ApplyChaosCard(string token, Guid nominationId, [FromBody] ApplyWowCardRequest request)
    {
        var sessionId = sessions.GetOrIssue(HttpContext, GuestSessionScope.Wow);
        try
        {
            var result = await service.ApplyGuestChaosCardAsync(token, nominationId, sessionId, request.Type);
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
            // hype_meter_tapped is broadcast by WinOfTheWeekService.IncrementHypeMeterAsync, which
            // IncrementGuestHypeMeterAsync delegates to — broadcasting here too would double-fire.
            var count = await service.IncrementGuestHypeMeterAsync(token, nominationId);
            return Ok(new { count });
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }
}
