using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.RetroCard;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("sprints")]
[Route("api/v1/retro-cards")]
public class RetroCardsController(IRetroCardService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetBySprintId([FromQuery] Guid sprintId)
    {
        var currentUserId = GetCurrentMemberId();
        return Ok(await service.GetBySprintAsync(sprintId, currentUserId));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRetroCardRequest request)
    {
        var card = await service.CreateAsync(request, GetCurrentMemberId());
        _ = WebSocketMiddleware.BroadcastAsync("retro_card_added", new { sprintId = request.SprintId, card });
        return CreatedAtAction(nameof(GetBySprintId), new { sprintId = request.SprintId }, card);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, [FromQuery] Guid sprintId)
    {
        var success = await service.DeleteAsync(id);
        if (!success) return NotFound();
        _ = WebSocketMiddleware.BroadcastAsync("retro_card_deleted", new { sprintId, cardId = id });
        return NoContent();
    }

    [HttpPost("{id:guid}/vote")]
    public async Task<IActionResult> ToggleVote(Guid id, [FromBody] VoteRequest request)
    {
        var voterId = GetCurrentMemberId();
        if (!voterId.HasValue) return Unauthorized();

        var result = await service.ToggleVoteAsync(id, voterId.Value);
        if (result is null) return Conflict(new { error = "Vote budget exhausted or card not found." });

        _ = WebSocketMiddleware.BroadcastAsync("retro_voted", new
        {
            sprintId = request.SprintId,
            cardId = id,
            voteCount = result.VoteCount,
        });
        return Ok(result);
    }

    private Guid? GetCurrentMemberId()
    {
        var claim = User.FindFirst("TMID")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}

public record VoteRequest(Guid SprintId);
