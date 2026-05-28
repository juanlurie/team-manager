using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.SlotLocation;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("settings")]
[Route("api/v1/slot-locations")]
public class SlotLocationsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool? activeOnly)
    {
        var query = db.Set<SlotLocation>().AsQueryable();
        if (activeOnly == true)
            query = query.Where(l => l.IsActive);
        var locations = await query
            .OrderBy(l => l.SortOrder)
            .ThenBy(l => l.Name)
            .Select(l => new SlotLocationDto
            {
                Id = l.Id,
                Name = l.Name,
                Color = l.Color,
                IsActive = l.IsActive,
                SortOrder = l.SortOrder
            })
            .ToListAsync();
        return Ok(locations);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var location = await db.Set<SlotLocation>().FindAsync(id);
        if (location is null) return NotFound();
        return Ok(new SlotLocationDto
        {
            Id = location.Id,
            Name = location.Name,
            Color = location.Color,
            IsActive = location.IsActive,
            SortOrder = location.SortOrder
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSlotLocationRequest request)
    {
        var location = new SlotLocation
        {
            Name = request.Name,
            Color = request.Color,
            IsActive = request.IsActive,
            SortOrder = request.SortOrder
        };
        db.Set<SlotLocation>().Add(location);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = location.Id }, new SlotLocationDto
        {
            Id = location.Id,
            Name = location.Name,
            Color = location.Color,
            IsActive = location.IsActive,
            SortOrder = location.SortOrder
        });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSlotLocationRequest request)
    {
        var location = await db.Set<SlotLocation>().FindAsync(id);
        if (location is null) return NotFound();
        location.Name = request.Name;
        location.Color = request.Color;
        location.IsActive = request.IsActive;
        location.SortOrder = request.SortOrder;
        await db.SaveChangesAsync();
        return Ok(new SlotLocationDto
        {
            Id = location.Id,
            Name = location.Name,
            Color = location.Color,
            IsActive = location.IsActive,
            SortOrder = location.SortOrder
        });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var location = await db.Set<SlotLocation>().FindAsync(id);
        if (location is null) return NotFound();
        db.Set<SlotLocation>().Remove(location);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
