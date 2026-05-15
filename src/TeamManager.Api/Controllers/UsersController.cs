using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Infrastructure.Models;

namespace TeamManager.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "TeamLead")]          // only leads can manage users
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;

    public UsersController(AppDbContext db) => _db = db;

    /* GET: api/users/unlinked
       returns JWTs we have seen but not yet linked to a TeamMember */
    [HttpGet("unlinked")]
    public async Task<IActionResult> GetUnlinked()
    {
        var linked = await _db.TeamMembers
                              .Where(tm => tm.ExternalSubjectId != null)
                              .Select(tm => tm.ExternalSubjectId)
                              .ToListAsync();

        // this is just an in-memory list for the demo; in real life you would
        // call the identity-provider SDK (Auth0 Management API, MS Graph, …)
        var allUsers = new[]
        {
            new { Sub = "auth0|60a", Email = "newbie@example.com", Name = "Newbie" },
            new { Sub = "auth0|60b", Email = "other@example.com",  Name = "Other"  }
};

        var unlinked = allUsers.Where(u => !linked.Contains(u.Sub));
        return Ok(unlinked);
    }

    /* POST: api/users/link
       body: { "externalSubjectId": "auth0|60a", "teamMemberId": 42 } */
    [HttpPost("link")]
    public async Task<IActionResult> Link([FromBody] LinkUserDto dto)
    {
        var tm = await _db.TeamMembers.FindAsync(dto.TeamMemberId);
        if (tm == null) return NotFound("TeamMember not found");

        tm.ExternalSubjectId = dto.ExternalSubjectId;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /* PATCH: api/users/5/toggle
       flips IsActive */
    [HttpPatch("{id:int}/toggle")]
    public async Task<IActionResult> Toggle(int id)
    {
        var tm = await _db.TeamMembers.FindAsync(id);
        if (tm == null) return NotFound();

        tm.IsActive = !tm.IsActive;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    public record LinkUserDto(string ExternalSubjectId, int TeamMemberId);
}
