using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.TeamMember;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/team-members")]
public class TeamMembersController(ITeamMemberService service) : ControllerBase
{
    // Plain roster lookups -- used well beyond the admin "Team Management" area (e.g. WoW's
    // nominee picker, assignee pickers across the app), so these stay open to any authenticated
    // member rather than gated behind the "team" feature permission. TeamMemberDto only exposes
    // name/email/role/squads/achievements, nothing sensitive enough to warrant gating here.
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? role, [FromQuery] Guid? teamLeadId, [FromQuery] bool? isActive)
        => Ok(await service.GetAllAsync(role, teamLeadId, isActive));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await service.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [RequireFeature("team")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTeamMemberRequest request)
    {
        var result = await service.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [RequireFeature("team")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTeamMemberRequest request)
    {
        var result = await service.UpdateAsync(id, request);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPatch("{id:guid}/avatar")]
    public async Task<IActionResult> UpdateAvatar(Guid id, [FromBody] UpdateAvatarRequest request)
    {
        var result = await service.UpdateAvatarAsync(id, request.Seed);
        return result is null ? NotFound() : Ok(result);
    }

    [RequireFeature("team")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await service.DeleteAsync(id);
        return success ? NoContent() : NotFound();
    }
}
