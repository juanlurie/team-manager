using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.Timesheet;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("team")]
[Route("api/v1/timesheets/approval")]
public class TimesheetApprovalController(ITimesheetApprovalService service) : ControllerBase
{
    [HttpPost("fetch")]
    public async Task<IActionResult> Fetch([FromBody] FetchTimesheetApprovalsRequest request)
    {
        try { return Ok(await service.FetchOutstandingAsync(request)); }
        catch (InvalidOperationException ex) { return BadRequest(new { detail = ex.Message }); }
    }
}
