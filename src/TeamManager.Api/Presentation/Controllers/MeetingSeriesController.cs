using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.MeetingSeries;
using TeamManager.Api.Application.DTOs.MeetingSeriesItem;
using TeamManager.Api.Application.DTOs.MeetingSeriesItemAvailability;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("meetings")]
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
        try
        {
            var success = await service.DeleteSeriesSlotAsync(id, slotId);
            return success ? NoContent() : NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
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

    [HttpPost("items/{itemId:guid}/unconfirm")]
    public async Task<IActionResult> UnconfirmItem(Guid itemId)
    {
        var result = await service.UnconfirmItemAsync(itemId);
        return result is null ? NotFound() : Ok(result);
    }

    // My Series
    [HttpGet("my-series")]
    public async Task<IActionResult> GetMySeries()
    {
        var memberId = GetCurrentMemberId();
        var result = await service.GetMySeriesAsync(memberId);
        return Ok(result);
    }

    // My Meetings
    [HttpGet("my-meetings")]
    public async Task<IActionResult> GetMyMeetings()
    {
        var memberId = GetCurrentMemberId();
        var items = await db.Set<TeamManager.Api.Domain.Entities.MeetingSeriesItem>()
            .Include(i => i.MeetingSeries).ThenInclude(s => s.CreatedBy)
            .Include(i => i.Participants).ThenInclude(p => p.TeamMember)
            .Include(i => i.Availabilities)
            .Where(i => i.Participants.Any(p => p.TeamMemberId == memberId))
            .OrderByDescending(i => i.MeetingSeries.CreatedAt)
            .ToListAsync();

        var result = items.Select(i =>
        {
            var participant = i.Participants.First(p => p.TeamMemberId == memberId);
            var mandatoryCount = i.Participants.Count(p => p.Role == "Mandatory");
            var mandatoryFilled = i.Participants
                .Where(p => p.Role == "Mandatory")
                .Count(p => i.Availabilities.Any(a => a.TeamMemberId == p.TeamMemberId));

            return new
            {
                itemId = i.Id,
                seriesId = i.MeetingSeriesId,
                seriesTitle = i.MeetingSeries.Title,
                itemTitle = i.Title,
                role = participant.Role,
                isConfirmed = i.IsConfirmed,
                mandatoryCount,
                mandatoryFilled,
                createdAt = i.CreatedAt
            };
        }).ToList();

        return Ok(result);
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

    // Bulk Availability
    [HttpGet("{seriesId:guid}/bulk-availability")]
    public async Task<IActionResult> GetBulkAvailability(Guid seriesId)
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.GetBulkAvailabilityAsync(seriesId, memberId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("{seriesId:guid}/bulk-availability")]
    public async Task<IActionResult> SubmitBulkAvailability(Guid seriesId, [FromBody] BulkAvailabilityRequest request)
    {
        var memberId = GetCurrentMemberId();
        try
        {
            var result = await service.SubmitBulkAvailabilityAsync(seriesId, memberId, request);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateException ex)
        {
            if (ex.InnerException?.Message.Contains("UQ_SlotClaim_Series_Slot") == true ||
                ex.InnerException?.Message.Contains("duplicate key") == true)
            {
                return Conflict(new { message = "A slot was claimed by another item while processing your request. Please review and try again." });
            }
            return StatusCode(500, new { message = "An error occurred while saving availability." });
        }
    }

    [HttpGet("{seriesId:guid}/my-availability")]
    public async Task<IActionResult> GetMyAvailability(Guid seriesId)
    {
        var memberId = GetCurrentMemberId();
        var result = await service.GetMyAvailabilityAsync(seriesId, memberId);
        return Ok(result);
    }

    [HttpPost("{seriesId:guid}/my-availability")]
    public async Task<IActionResult> SetMyAvailability(Guid seriesId, [FromBody] SetMyAvailabilityRequest request)
    {
        var memberId = GetCurrentMemberId();
        try
        {
            await service.SetMyAvailabilityAsync(seriesId, memberId, request);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
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
