using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.Squad;
using TeamManager.Api.Application.Services;

namespace TeamManager.Api.Presentation.Controllers;

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
    public async Task<IActionResult> Create([FromBody] CreateSquadRequest request)
    {
        var result = await service.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("api/v1/squads/{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateSquadRequest request)
    {
        var result = await service.UpdateAsync(id, request);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("api/v1/squads/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await service.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPut("api/v1/squads/{id:guid}/members")]
    public async Task<IActionResult> SetMembers(Guid id, [FromBody] SetSquadMembersRequest request)
    {
        var result = await service.SetMembersAsync(id, request.MemberIds);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPut("api/v1/team-members/{memberId:guid}/squads")]
    public async Task<IActionResult> SetMemberSquads(Guid memberId, [FromBody] SetMemberSquadsRequest request)
    {
        await service.SetMemberSquadsAsync(memberId, request.SquadIds);
        return NoContent();
    }
}
