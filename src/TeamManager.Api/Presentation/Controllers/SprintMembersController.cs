using TeamManager.Api.Middleware;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/sprint-members")]
public class SprintMembersController(AppDbContext db) : ControllerBase
{
    [HttpGet("sprint/{sprintId:guid}")]
    public async Task<IActionResult> GetBySprint(Guid sprintId)
    {
        var members = await db.SprintMembers
            .Where(sm => sm.SprintId == sprintId)
            .Select(sm => new { sm.Id, sm.TeamMemberId })
            .ToListAsync();
        return Ok(members);
    }

    [HttpPatch("{id:guid}/notes")]
    public async Task<IActionResult> UpdateNotes(Guid id, [FromBody] UpdateNotesRequest request)
    {
        var sm = await db.SprintMembers.FindAsync(id);
        if (sm is null) return NotFound();
        sm.Notes = request.Notes;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id:guid}/capacity")]
    public async Task<IActionResult> UpdateCapacity(Guid id, [FromBody] UpdateCapacityRequest request)
    {
        var sm = await db.SprintMembers.FindAsync(id);
        if (sm is null) return NotFound();
        sm.Capacity = request.Capacity;
        await db.SaveChangesAsync();
        return NoContent();
    }
}

public record UpdateNotesRequest([MaxLength(2000)] string? Notes);
public record UpdateCapacityRequest([Range(10, 100)] int? Capacity);
