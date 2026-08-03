using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.TeamMember;
using TeamManager.Api.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;

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

    // Role assignment is split off from Update on purpose: it is the one field on a member that
    // is a privilege boundary. Both gates apply -- [RequireFeature] answers "is this turned on
    // for you", [Authorize] answers "are you allowed"; neither substitutes for the other.
    // "Admin" is listed explicitly so this endpoint is correct on its own; once the claims
    // transformer emits the implied TeamLead claim for Admins it becomes redundant, not wrong.
    [RequireFeature("team")]
    [Authorize(Roles = "TeamLead,Admin")]
    [HttpPut("{id:guid}/role")]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpdateMemberRoleRequest request)
    {
        var result = await service.UpdateRoleAsync(
            id, request.Role!.Value, HttpContext.GetCurrentMemberId(), User.IsInRole("Admin"));

        return result.Outcome switch
        {
            RoleChangeOutcome.Success => Ok(result.Member),
            RoleChangeOutcome.NotFound => NotFound(),
            // Forbid() writes no body; these need to reach the user as readable text.
            RoleChangeOutcome.Forbidden => StatusCode(StatusCodes.Status403Forbidden,
                new { error = "Only an Admin can grant the Admin role or change an Admin's role." }),
            RoleChangeOutcome.LastAdmin => BadRequest(
                new { error = "This is the only Admin. Grant Admin to someone else before changing this role." }),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }

    [Authorize]
    [HttpPatch("{id:guid}/avatar")]
    public async Task<IActionResult> UpdateAvatar(Guid id, [FromBody] UpdateAvatarRequest request)
    {
        var callerId = HttpContext.GetCurrentMemberId();
        var isLead = User.IsInRole("TeamLead") || User.IsInRole("TechLead");
        if (!isLead && callerId != id)
            return Forbid();

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
