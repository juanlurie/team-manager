using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.Squad;
using TeamManager.Api.Application.Services;

namespace TeamManager.Api.Presentation.Controllers;

/// <summary>
/// Squads are org structure, and since C they carry a TeamId -- rewriting one is org-structure
/// tampering, not a preference. Every write is [Authorize(Roles = "TeamLead")]; the controller had
/// no role attribute at all, so any authenticated member could create, rename and delete squads and
/// rewrite anyone's memberships. [RequireFeature] is not a substitute: "team" is not in
/// DefaultOffFeatures, so the feature check alone fails open for a plain Member.
///
/// The reads are deliberately *not* gated. Squad lists feed ordinary member-facing screens (retro
/// board, leave overview, sprints, the k-picker, export), so a controller-level attribute would lock
/// plain members out of features that have nothing to do with managing squads. Membership of a squad
/// is not sensitive; the ability to change it is. TechLead is excluded -- no management significance.
/// Admin passes via the implied TeamLead claim (RoleHierarchy).
/// </summary>
[ApiController]
[RequireFeature("team")]
public class SquadsController(SquadService service) : ControllerBase
{
    [HttpGet("api/v1/squads")]
    public async Task<IActionResult> GetAll() =>
        Ok(await service.GetAllAsync());

    [HttpGet("api/v1/squads/{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await service.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("api/v1/squads")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Create([FromBody] CreateSquadRequest request)
    {
        var result = await service.CreateAsync(request);
        return result.Outcome switch
        {
            SquadSaveOutcome.TeamNotFound => BadRequest(new { message = "Selected team not found." }),
            _ => CreatedAtAction(nameof(GetById), new { id = result.Squad!.Id }, result.Squad)
        };
    }

    [HttpPut("api/v1/squads/{id:guid}")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSquadRequest request)
    {
        var result = await service.UpdateAsync(id, request);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>Moves the squad to a team, or out of one when TeamId is null.</summary>
    [HttpPut("api/v1/squads/{id:guid}/team")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> SetTeam(Guid id, [FromBody] SetSquadTeamRequest request)
    {
        var result = await service.SetTeamAsync(id, request.TeamId);
        return result.Outcome switch
        {
            SquadSaveOutcome.NotFound => NotFound(),
            SquadSaveOutcome.TeamNotFound => BadRequest(new { message = "Selected team not found." }),
            _ => Ok(result.Squad)
        };
    }

    [HttpDelete("api/v1/squads/{id:guid}")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await service.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPut("api/v1/squads/{id:guid}/members")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> SetMembers(Guid id, [FromBody] SetSquadMembersRequest request)
    {
        var result = await service.SetMembersAsync(id, request.MemberIds);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPut("api/v1/team-members/{memberId:guid}/squads")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> SetMemberSquads(Guid memberId, [FromBody] SetMemberSquadsRequest request)
    {
        await service.SetMemberSquadsAsync(memberId, request.SquadIds);
        return NoContent();
    }
}
