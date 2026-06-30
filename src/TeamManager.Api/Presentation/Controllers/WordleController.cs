using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.Wordle;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("wordle")]
[Route("api/v1/wordle")]
public class WordleController(WordleService service, AppDbContext db) : ControllerBase
{
    [HttpGet("sessions")]
    public async Task<IActionResult> GetOpenSessions()
    {
        var result = await service.GetOpenSessionsAsync();
        return Ok(result);
    }

    [HttpPost("sessions")]
    [RequireFeature("wordle-host")]
    public async Task<IActionResult> CreateSession([FromBody] CreateWordleSessionRequest request)
    {
        var memberId = GetCurrentMemberId();
        var result = await service.CreateSessionAsync(memberId, request.Title);
        return Ok(result);
    }

    [HttpGet("sessions/{id:guid}")]
    public async Task<IActionResult> GetSession(Guid id)
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.GetSessionAsync(id, memberId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
    }

    [HttpPost("sessions/{id:guid}/join")]
    public async Task<IActionResult> JoinSession(Guid id)
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.JoinSessionAsync(memberId, id);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("sessions/{id:guid}/start")]
    [RequireFeature("wordle-host")]
    public async Task<IActionResult> StartSession(Guid id)
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.StartSessionAsync(memberId, id);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("sessions/{id:guid}/guess")]
    public async Task<IActionResult> SubmitGuess(Guid id, [FromBody] SubmitWordleGuessRequest request)
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.SubmitGuessAsync(memberId, id, request.Word);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
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
