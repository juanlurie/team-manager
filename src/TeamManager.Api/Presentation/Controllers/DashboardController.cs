using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/dashboard")]
public class DashboardController(IDashboardService service) : ControllerBase
{
    [HttpGet("sprint/{sprintId:guid}")]
    public async Task<IActionResult> GetSprintDashboard(Guid sprintId, [FromQuery] Guid? teamLeadId)
    {
        var result = await service.GetSprintDashboardAsync(sprintId, teamLeadId);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("sprint/{sprintId:guid}/summary")]
    public async Task<IActionResult> GetSprintSummary(Guid sprintId)
    {
        var result = await service.GetSprintSummaryAsync(sprintId);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("sprint/{sprintId:guid}/blockers")]
    public async Task<IActionResult> GetBlockers(Guid sprintId)
        => Ok(await service.GetBlockersAsync(sprintId));
}
