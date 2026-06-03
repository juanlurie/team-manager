using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.ScrumPoker;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Authorize]
[RequireFeature("scrum-poker")]
[Route("api/v1/scrum-poker")]
public class ScrumPokerController : ControllerBase
{
    private readonly IScrumPokerService service;

    public ScrumPokerController(IScrumPokerService service)
    {
        this.service = service;
    }

    private Guid GetMemberId()
    {
        var id = User.FindFirst("TMID")?.Value;
        return Guid.TryParse(id, out var memberId) ? memberId : throw new UnauthorizedAccessException("MemberId claim not found.");
    }

    [HttpGet("sessions")]
    public async Task<IActionResult> GetActiveSessions()
    {
        var sessions = await service.GetActiveSessionsAsync(GetMemberId());
        return Ok(new { items = sessions });
    }

    [HttpGet("sessions/{sessionId}")]
    public async Task<IActionResult> GetSession(Guid sessionId)
    {
        var session = await service.GetSessionAsync(sessionId, GetMemberId());
        return Ok(session);
    }

    [HttpPost("sessions")]
    public async Task<IActionResult> CreateSession([FromBody] CreateScrumPokerSessionRequest request)
    {
        var session = await service.CreateSessionAsync(GetMemberId(), request);
        return Ok(session);
    }

    [HttpPost("sessions/{sessionId}/vote")]
    public async Task<IActionResult> CastVote(Guid sessionId, [FromBody] CastScrumPokerVoteRequest request)
    {
        var session = await service.CastVoteAsync(sessionId, GetMemberId(), request);
        return Ok(session);
    }

    [HttpPost("sessions/{sessionId}/reveal")]
    public async Task<IActionResult> RevealVotes(Guid sessionId)
    {
        var session = await service.RevealVotesAsync(sessionId, GetMemberId());
        return Ok(session);
    }

    [HttpPost("sessions/{sessionId}/reset")]
    public async Task<IActionResult> ResetSession(Guid sessionId)
    {
        var session = await service.ResetSessionAsync(sessionId, GetMemberId());
        return Ok(session);
    }

    [HttpDelete("sessions/{sessionId}")]
    public async Task<IActionResult> DeleteSession(Guid sessionId)
    {
        var deleted = await service.DeleteSessionAsync(sessionId, GetMemberId());
        return deleted ? NoContent() : NotFound();
    }
}
