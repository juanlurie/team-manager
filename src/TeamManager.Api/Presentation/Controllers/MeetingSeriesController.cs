using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.MeetingSeries;
using TeamManager.Api.Application.DTOs.MeetingSeriesItem;
using TeamManager.Api.Application.DTOs.MeetingSeriesItemAvailability;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/meeting-series")]
public class MeetingSeriesController(IMeetingSeriesService service, AppDbContext db) : ControllerBase
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
    public async Task<IActionResult> Create([FromBody] CreateMeetingSeriesRequest request)
    {
        var memberId = GetCurrentMemberId();
        var result = await service.CreateAsync(request, memberId);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMeetingSeriesRequest request)
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

    // Slots
    [HttpGet("{id:guid}/slots")]
    public async Task<IActionResult> GetSlots(Guid id)
    {
        var result = await service.GetSeriesSlotsAsync(id);
        return Ok(result);
    }

    [HttpPost("{id:guid}/slots")]
    public async Task<IActionResult> CreateSlots(Guid id, [FromBody] CreateMeetingSeriesSlotsRequest request)
    {
        var result = await service.CreateSeriesSlotsAsync(id, request);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPut("{id:guid}/slots/{slotId:guid}")]
    public async Task<IActionResult> UpdateSlot(Guid id, Guid slotId, [FromBody] UpdateMeetingSeriesSlotRequest request)
    {
        var result = await service.UpdateSeriesSlotAsync(id, slotId, request);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}/slots/{slotId:guid}")]
    public async Task<IActionResult> DeleteSlot(Guid id, Guid slotId)
    {
        var success = await service.DeleteSeriesSlotAsync(id, slotId);
        return success ? NoContent() : NotFound();
    }

    // Items
    [HttpGet("{id:guid}/items")]
    public async Task<IActionResult> GetItems(Guid id)
    {
        var result = await service.GetSeriesItemsAsync(id);
        return Ok(result);
    }

    [HttpPost("{id:guid}/items")]
    public async Task<IActionResult> CreateItem(Guid id, [FromBody] CreateMeetingSeriesItemRequest request)
    {
        var result = await service.CreateSeriesItemAsync(id, request);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPut("{id:guid}/items/{itemId:guid}")]
    public async Task<IActionResult> UpdateItem(Guid id, Guid itemId, [FromBody] UpdateMeetingSeriesItemRequest request)
    {
        var result = await service.UpdateSeriesItemAsync(id, itemId, request);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}/items/{itemId:guid}")]
    public async Task<IActionResult> DeleteItem(Guid id, Guid itemId)
    {
        var success = await service.DeleteSeriesItemAsync(id, itemId);
        return success ? NoContent() : NotFound();
    }

    // Availability
    [HttpGet("items/{itemId:guid}/availability")]
    public async Task<IActionResult> GetAvailabilities(Guid itemId)
    {
        var result = await service.GetItemAvailabilitiesAsync(itemId);
        return Ok(result);
    }

    [HttpPost("items/{itemId:guid}/availability")]
    public async Task<IActionResult> AddAvailability(Guid itemId, [FromBody] AddMeetingSeriesItemAvailabilityRequest request)
    {
        var result = await service.AddItemAvailabilityAsync(itemId, request);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("items/{itemId:guid}/availability/{availabilityId:guid}")]
    public async Task<IActionResult> RemoveAvailability(Guid itemId, Guid availabilityId)
    {
        var result = await service.RemoveItemAvailabilityAsync(itemId, availabilityId);
        return result is null ? NotFound() : Ok(result);
    }

    private Guid GetCurrentMemberId()
    {
        var nameIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (Guid.TryParse(nameIdClaim, out var memberId))
            return memberId;

        var firstMember = db.Set<TeamManager.Api.Domain.Entities.TeamMember>()
            .Where(m => m.IsActive)
            .OrderBy(m => m.CreatedAt)
            .Select(m => (Guid?)m.Id)
            .FirstOrDefault();

        return firstMember ?? Guid.Empty;
    }
}