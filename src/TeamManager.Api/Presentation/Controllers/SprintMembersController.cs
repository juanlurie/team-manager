using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/sprint-members")]
public class SprintMembersController(AppDbContext db) : ControllerBase
{
    [HttpPatch("{id:guid}/notes")]
    public async Task<IActionResult> UpdateNotes(Guid id, [FromBody] UpdateNotesRequest request)
    {
        var sm = await db.SprintMembers.FindAsync(id);
        if (sm is null) return NotFound();
        sm.Notes = request.Notes;
        await db.SaveChangesAsync();
        return NoContent();
    }
}

public record UpdateNotesRequest(string? Notes);
