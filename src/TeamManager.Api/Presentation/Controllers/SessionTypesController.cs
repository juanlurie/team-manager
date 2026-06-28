using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.SessionType;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("meetings")]
[Route("api/v1/session-types")]
public class SessionTypesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool? activeOnly)
    {
        var query = db.Set<SessionType>().AsQueryable();
        if (activeOnly == true)
            query = query.Where(t => t.IsActive);
        var types = await query
            .OrderBy(t => t.SortOrder)
            .ThenBy(t => t.Name)
            .Select(t => new SessionTypeDto
            {
                Id = t.Id,
                Name = t.Name,
                Color = t.Color,
                IsActive = t.IsActive,
                SortOrder = t.SortOrder
            })
            .ToListAsync();
        return Ok(types);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var type = await db.Set<SessionType>().FindAsync(id);
        if (type is null) return NotFound();
        return Ok(new SessionTypeDto
        {
            Id = type.Id,
            Name = type.Name,
            Color = type.Color,
            IsActive = type.IsActive,
            SortOrder = type.SortOrder
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSessionTypeRequest request)
    {
        var type = new SessionType
        {
            Name = request.Name,
            Color = request.Color,
            IsActive = request.IsActive,
            SortOrder = request.SortOrder
        };
        db.Set<SessionType>().Add(type);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = type.Id }, new SessionTypeDto
        {
            Id = type.Id,
            Name = type.Name,
            Color = type.Color,
            IsActive = type.IsActive,
            SortOrder = type.SortOrder
        });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSessionTypeRequest request)
    {
        var type = await db.Set<SessionType>().FindAsync(id);
        if (type is null) return NotFound();
        type.Name = request.Name;
        type.Color = request.Color;
        type.IsActive = request.IsActive;
        type.SortOrder = request.SortOrder;
        await db.SaveChangesAsync();
        return Ok(new SessionTypeDto
        {
            Id = type.Id,
            Name = type.Name,
            Color = type.Color,
            IsActive = type.IsActive,
            SortOrder = type.SortOrder
        });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var type = await db.Set<SessionType>().FindAsync(id);
        if (type is null) return NotFound();
        db.Set<SessionType>().Remove(type);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
