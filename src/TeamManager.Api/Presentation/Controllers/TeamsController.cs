using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.Team;
using TeamManager.Api.Application.Services;

namespace TeamManager.Api.Presentation.Controllers;

/// <summary>
/// Teams are org structure. Both gates, from the start: [RequireFeature] answers "is this
/// turned on for you", [Authorize] answers "are you allowed to do this". Neither substitutes
/// for the other -- "team" is not in DefaultOffFeatures, so the feature check alone fails open.
/// Admin passes the role check via the implied TeamLead claim (RoleHierarchy).
/// </summary>
[ApiController]
[Route("api/v1/teams")]
[RequireFeature("team")]
[Authorize(Roles = "TeamLead")]
public class TeamsController(TeamService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await service.GetAllAsync());

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await service.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTeamRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Team name is required." });

        var result = await service.CreateAsync(request);
        return result.Outcome switch
        {
            TeamSaveOutcome.DuplicateName => Conflict(new { message = $"A team named '{request.Name.Trim()}' already exists." }),
            _ => CreatedAtAction(nameof(GetById), new { id = result.Team!.Id }, result.Team)
        };
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateTeamRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Team name is required." });

        var result = await service.UpdateAsync(id, request);
        return result.Outcome switch
        {
            TeamSaveOutcome.NotFound => NotFound(),
            TeamSaveOutcome.DuplicateName => Conflict(new { message = $"A team named '{request.Name.Trim()}' already exists." }),
            _ => Ok(result.Team)
        };
    }

    /// <summary>Detaches the team's squads rather than deleting them (Squad.TeamId is SetNull).</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await service.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
