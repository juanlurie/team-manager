using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.MeetingSession;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/meeting-sessions")]
public class MeetingSessionsController(IMeetingSessionService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await service.GetAllAsync());

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await service.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSessionRequest request)
    {
        // TODO: Replace with actual authenticated user ID once auth is integrated
        var memberId = GetCurrentMemberId();
        var result = await service.CreateAsync(request, memberId);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSessionRequest request)
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

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateStatusRequest request)
    {
        var result = await service.UpdateStatusAsync(id, request.Status);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("{id:guid}/slots/{slotId:guid}/book")]
    public async Task<IActionResult> BookSlot(Guid id, Guid slotId, [FromBody] BookSlotRequest request)
    {
        var memberId = GetCurrentMemberId();
        var result = await service.BookSlotAsync(id, slotId, memberId, request);
        if (result is null) return BadRequest(new { error = "Slot cannot be booked. It may already be taken, the session may be cancelled, or you may already have a slot." });
        return Ok(result);
    }

    [HttpDelete("{id:guid}/slots/{slotId:guid}/book")]
    public async Task<IActionResult> UnbookSlot(Guid id, Guid slotId)
    {
        var result = await service.UnbookSlotAsync(id, slotId);
        if (result is null) return NotFound();
        return Ok(result);
    }

    private Guid GetCurrentMemberId()
    {
        // Placeholder: In real app, extract from JWT claims or user identity
        // Try to get from the name identifier claim first
        var nameIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (Guid.TryParse(nameIdClaim, out var memberId))
            return memberId;

        // Fallback: use first active member (for development)
        // This will be replaced once auth is fully wired
        return Guid.Empty;
    }
}
