using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.QuizGame;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("quiz-game")]
[Route("api/v1/quiz-game")]
public class QuizGameController(QuizGameService service, AppDbContext db) : ControllerBase
{
    [HttpGet("sessions")]
    public async Task<IActionResult> GetOpenSessions()
    {
        var result = await service.GetOpenSessionsAsync();
        return Ok(result);
    }

    [HttpPost("sessions")]
    [RequireFeature("quiz-game-host")]
    public async Task<IActionResult> CreateSession([FromBody] CreateQuizGameSessionRequest request)
    {
        var memberId = GetCurrentMemberId();
        var result = await service.CreateSessionAsync(memberId, request.Title, request.QuestionCount, request.GameMode, request.DifficultyLevel);
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
    [RequireFeature("quiz-game-host")]
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

    [HttpPost("sessions/{id:guid}/answer")]
    public async Task<IActionResult> SubmitAnswer(Guid id, [FromBody] SubmitQuizGameAnswerRequest request)
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var (isCorrect, correctIndex) = await service.SubmitAnswerAsync(memberId, id, request.SelectedIndex);
            return Ok(new { isCorrect, correctIndex });
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("sessions/{id:guid}/millionaire/start")]
    public async Task<IActionResult> StartMillionaireRun(Guid id)
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.StartMillionaireRunAsync(memberId, id);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("sessions/{id:guid}/millionaire/answer")]
    public async Task<IActionResult> SubmitMillionaireAnswer(Guid id, [FromBody] SubmitQuizGameAnswerRequest request)
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.SubmitMillionaireAnswerAsync(memberId, id, request.SelectedIndex);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("sessions/{id:guid}/millionaire/walk-away")]
    public async Task<IActionResult> WalkAway(Guid id)
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.WalkAwayAsync(memberId, id);
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
