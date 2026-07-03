using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.Poll;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("polls")]
[Route("api/v1/polls")]
public class PollsController(PollService service, AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetOpenPolls()
    {
        var result = await service.GetOpenPollsAsync();
        return Ok(result);
    }

    [HttpPost]
    [RequireFeature("polls-host")]
    public async Task<IActionResult> Create([FromBody] CreatePollRequest request)
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.CreateAsync(memberId, request.Question, request.Options, request.HideResultsUntilClosed, request.ScheduledCloseAt, request.RetroSessionId);
            return Ok(result);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetDetail(string id, [FromQuery] bool reveal = false)
    {
        var memberId = GetCurrentMemberId();
        var pollId = await service.ResolvePollIdAsync(id);
        if (pollId is null) return NotFound();
        try
        {
            var result = await service.GetDetailAsync(pollId.Value, memberId, reveal);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
    }

    [HttpPost("{id:guid}/vote")]
    public async Task<IActionResult> Vote(Guid id, [FromBody] CastPollVoteRequest request)
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.VoteAsync(memberId, id, request.OptionId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPut("{id:guid}/settings")]
    [RequireFeature("polls-host")]
    public async Task<IActionResult> UpdateSettings(Guid id, [FromBody] UpdatePollSettingsRequest request)
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.UpdateSettingsAsync(memberId, id, request.HideResultsUntilClosed, request.ScheduledCloseAt);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("{id:guid}/close")]
    [RequireFeature("polls-host")]
    public async Task<IActionResult> Close(Guid id)
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.ClosePollAsync(memberId, id);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpDelete("{id:guid}")]
    [RequireFeature("polls-host")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var memberId = GetCurrentMemberId();
        try
        {
            await service.DeletePollAsync(memberId, id);
            return Ok();
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
