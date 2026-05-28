using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.Timesheet;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/team-members/{memberId:guid}/timesheet-config")]
public class TimesheetConfigController(ITimesheetConfigService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(Guid memberId)
        => Ok(await service.GetAsync(memberId));

    [HttpPut]
    public async Task<IActionResult> Upsert(Guid memberId, [FromBody] UpsertTimesheetConfigRequest request)
        => Ok(await service.UpsertAsync(memberId, request));
}
