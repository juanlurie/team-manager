using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.Timesheet;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("team")]
[Route("api/v1/me/timesheet-config")]
public class MeTimesheetConfigController(ITimesheetConfigService service) : ControllerBase
{
    private Guid CurrentMemberId => HttpContext.GetCurrentMemberId();

    [HttpGet]
    public async Task<IActionResult> Get()
        => Ok(await service.GetAsync(CurrentMemberId));

    [HttpPut]
    public async Task<IActionResult> Upsert([FromBody] UpsertTimesheetConfigRequest request)
        => Ok(await service.UpsertAsync(CurrentMemberId, request));
}
