using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.Sprint;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("sprints")]
[Route("api/v1/sprints")]
public class SprintsController(ISprintService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? piId, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
        => Ok(await service.GetAllAsync(piId, from, to));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await service.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSprintRequest request)
    {
        var result = await service.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateSprintRequest request)
    {
        var result = await service.UpdateAsync(id, request);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await service.DeleteAsync(id);
        return success ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/initialize-members")]
    public async Task<IActionResult> InitializeMembers(Guid id)
    {
        var count = await service.InitializeMembersAsync(id);
        return Ok(new { addedCount = count });
    }

    [HttpPatch("{id:guid}/retro")]
    public async Task<IActionResult> UpdateRetro(Guid id, [FromBody] UpdateRetroRequest request)
    {
        var result = await service.UpdateRetroAsync(id, request);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPatch("{id:guid}/retro-phase")]
    public async Task<IActionResult> UpdateRetroPhase(Guid id, [FromBody] UpdateRetroPhaseRequest request)
    {
        var result = await service.UpdateRetroPhaseAsync(id, request.Phase);
        if (result is null) return NotFound();
        _ = WebSocketMiddleware.BroadcastAsync("retro_phase_changed", new { sprintId = id, phase = request.Phase });
        return Ok(result);
    }

    [HttpPost("{id:guid}/clone")]
    public async Task<IActionResult> Clone(Guid id, [FromBody] CloneSprintRequest request)
    {
        var result = await service.CloneAsync(id, request);
        return result is null ? NotFound() : CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPatch("{id:guid}/close")]
    public async Task<IActionResult> Close(Guid id)
    {
        var result = await service.CloseAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("velocity")]
    public async Task<IActionResult> GetVelocity([FromQuery] Guid? piId)
        => Ok(await service.GetVelocityAsync(piId));

    // ── Retro phase timer ──────────────────────────
    [HttpGet("{id:guid}/retro-timer")]
    public async Task<IActionResult> GetRetroTimer(Guid id)
        => Ok(new { timerJson = await service.GetRetroTimerAsync(id) });

    [HttpPost("{id:guid}/retro-timer")]
    public async Task<IActionResult> SetRetroTimer(Guid id, [FromBody] RetroTimerRequest request)
    {
        var timerJson = System.Text.Json.JsonSerializer.Serialize(new
        {
            totalSeconds       = request.TotalSeconds,
            startedAt          = request.StartedAt,
            pausedAt           = request.PausedAt,
            elapsedBeforePause = request.ElapsedBeforePause,
        });
        var ok = await service.SetRetroTimerAsync(id, timerJson);
        if (!ok) return NotFound();
        _ = WebSocketMiddleware.BroadcastAsync("retro_timer_updated", new { sprintId = id, timerJson });
        return Ok(new { timerJson });
    }

    // ── Retro icebreaker ───────────────────────────
    [HttpGet("{id:guid}/retro-icebreaker-answers")]
    public async Task<IActionResult> GetIcebreakerAnswers(Guid id)
        => Ok(await service.GetIcebreakerAnswersAsync(id));

    [HttpPost("{id:guid}/retro-icebreaker-answer")]
    public async Task<IActionResult> SubmitIcebreakerAnswer(Guid id, [FromBody] IcebreakerAnswerRequest request)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();
        var answer = (request.Answer ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(answer)) return BadRequest(new { error = "Answer required." });

        var answers = await service.UpsertIcebreakerAnswerAsync(id, memberId.Value, answer);
        if (answers is null) return NotFound();

        var mine = answers.FirstOrDefault(a => a.MemberId == memberId.Value);
        _ = WebSocketMiddleware.BroadcastAsync("retro_icebreaker_answered", new
        {
            sprintId   = id,
            memberId   = memberId.Value,
            memberName = mine?.MemberName ?? string.Empty,
            answer,
        });
        return Ok(answers);
    }

    // ── Retro AI summary ───────────────────────────
    [HttpPost("{id:guid}/retro-summary")]
    public async Task<IActionResult> RetroSummary(Guid id)
    {
        var summary = await service.GenerateRetroSummaryAsync(id);
        if (string.IsNullOrWhiteSpace(summary))
            return StatusCode(503, new { error = "AI summary not configured" });
        return Ok(new { summary });
    }

    private Guid? GetCurrentMemberId()
    {
        var claim = User.FindFirst("TMID")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
