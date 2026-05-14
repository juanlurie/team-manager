using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.MeetingSession;
using TeamManager.Api.Application.DTOs.SessionDefinition;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/session-definitions")]
public class SessionDefinitionsController(ISessionDefinitionService service, AppDbContext db) : ControllerBase
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
    public async Task<IActionResult> Create([FromBody] CreateSessionDefinitionRequest request)
    {
        var memberId = GetCurrentMemberId();
        var result = await service.CreateAsync(request, memberId);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSessionDefinitionRequest request)
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

    [HttpPost("{id:guid}/slots")]
    public async Task<IActionResult> CreateSlots(Guid id, [FromBody] CreateSessionSlotsRequest request)
    {
        var result = await service.CreateSlotsAsync(id, request);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("{id:guid}/slots")]
    public async Task<IActionResult> GetSlots(Guid id)
    {
        var result = await service.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result?.Slots);
    }

    [HttpPut("{id:guid}/slots/{slotId:guid}")]
    public async Task<IActionResult> UpdateSlot(Guid id, Guid slotId, [FromBody] UpdateSessionSlotRequest request)
    {
        var result = await service.UpdateSlotAsync(id, slotId, request);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}/slots/{slotId:guid}")]
    public async Task<IActionResult> DeleteSlot(Guid id, Guid slotId)
    {
        var success = await service.DeleteSlotAsync(id, slotId);
        return success ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/slots/{slotId:guid}/book")]
    public async Task<IActionResult> BookSlot(Guid id, Guid slotId, [FromBody] BookSessionSlotRequest request)
    {
        var memberId = GetCurrentMemberId();
        var result = await service.BookSlotAsync(id, slotId, memberId, request);
        if (result is null) return BadRequest(new { error = "Slot cannot be booked." });
        return Ok(result);
    }

    [HttpDelete("{id:guid}/slots/{slotId:guid}/book")]
    public async Task<IActionResult> UnbookSlot(Guid id, Guid slotId)
    {
        var memberId = GetCurrentMemberId();
        var result = await service.UnbookSlotAsync(id, slotId, memberId);
        if (result is null) return NotFound();
        return Ok(result);
    }

    [HttpGet("{id:guid}/connected-meetings")]
    public async Task<IActionResult> GetConnectedMeetings(Guid id)
    {
        var slotIds = await db.Set<SessionDefinitionSlot>()
            .Where(sl => sl.SessionDefinitionId == id && sl.IsConfirmed)
            .Select(sl => sl.Id)
            .ToListAsync();

        if (slotIds.Count == 0)
            return Ok(Array.Empty<MeetingSessionDto>());

        var meetings = await db.Set<MeetingSession>()
            .Include(ms => ms.SessionDefinition)
            .Include(ms => ms.CreatedBy)
            .Include(ms => ms.Slots).ThenInclude(sl => sl.TeamMember)
            .Include(ms => ms.Slots).ThenInclude(sl => sl.Location)
            .Where(ms => ms.SessionDefinitionSlotId != null && slotIds.Contains(ms.SessionDefinitionSlotId!.Value))
            .ToListAsync();

        var dtos = meetings.Select(MeetingSessionService.ToDto).ToList();
        return Ok(dtos);
    }

    private Guid GetCurrentMemberId()
    {
        var nameIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (Guid.TryParse(nameIdClaim, out var memberId))
            return memberId;

        var firstMember = db.Set<Domain.Entities.TeamMember>()
            .Where(m => m.IsActive)
            .OrderBy(m => m.CreatedAt)
            .Select(m => (Guid?)m.Id)
            .FirstOrDefault();

        return firstMember ?? Guid.Empty;
    }
}
