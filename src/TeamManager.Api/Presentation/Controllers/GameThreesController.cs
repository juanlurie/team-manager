using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.GameThrees;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("threes")]
[Route("api/v1/game-threes")]
public class GameThreesController(GameThreesService svc) : ControllerBase
{
    private Guid MemberId => Guid.Parse(User.FindFirst("sub")?.Value ?? Guid.Empty.ToString());

    [HttpGet("sessions")]
    public async Task<IActionResult> GetSessions() => Ok(await svc.GetOpenSessionsAsync());

    [HttpGet("sessions/{id:guid}")]
    public async Task<IActionResult> GetSession(Guid id)
    {
        var result = await svc.GetSessionAsync(id, MemberId);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("sessions")]
    [RequireFeature("threes-host")]
    public async Task<IActionResult> Create([FromBody] CreateGameThreesSessionRequest req)
    {
        var session = await svc.CreateSessionAsync(MemberId, req);
        return Ok(session);
    }

    [HttpPost("sessions/{id:guid}/join")]
    public async Task<IActionResult> Join(Guid id)
    {
        var (session, error) = await svc.JoinSessionAsync(id, MemberId);
        if (error is not null) return BadRequest(new { error });
        if (session is null) return NotFound();
        return Ok(session);
    }

    [HttpPost("sessions/{id:guid}/move")]
    public async Task<IActionResult> Move(Guid id, [FromBody] GameThreesMoveRequest req)
    {
        var (session, error) = await svc.MakeMoveAsync(id, MemberId, req);
        if (error is not null) return BadRequest(new { error });
        if (session is null) return NotFound();
        return Ok(session);
    }
}
