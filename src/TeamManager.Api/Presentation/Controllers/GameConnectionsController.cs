using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.GameConnections;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("connections")]
[Route("api/v1/game-connections")]
[Authorize]
public class GameConnectionsController(GameConnectionsService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetSessions()
        => Ok(await service.GetOpenSessionsAsync());

    [HttpPost]
    [RequireFeature("connections-host")]
    public async Task<IActionResult> CreateSession([FromBody] CreateGameConnectionsSessionRequest request)
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

    [HttpPost("{id:guid}/join")]
    public async Task<IActionResult> JoinSession(Guid id)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();
        var (session, error) = await service.JoinSessionAsync(id, memberId.Value);
        if (session is null && error is null) return NotFound();
        if (error is not null) return Conflict(new { error });
        return Ok(session);
    }

    [HttpPost("{id:guid}/start")]
    public async Task<IActionResult> StartSession(Guid id)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();
        var (session, error) = await service.StartSessionAsync(id, memberId.Value);
        if (session is null && error is null) return NotFound();
        if (error is not null) return Conflict(new { error });
        return Ok(session);
    }

    [HttpPost("{id:guid}/move")]
    public async Task<IActionResult> SubmitGuess(Guid id, [FromBody] SubmitConnectionsGuessRequest request)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();
        var (session, error) = await service.SubmitGuessAsync(id, memberId.Value, request);
        if (session is null && error is null) return NotFound();
        if (error is not null) return Conflict(new { error });
        return Ok(session);
    }

    private Guid? GetCurrentMemberId()
    {
        var claim = User.FindFirst("TMID")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
