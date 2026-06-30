using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.Timesheet;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("team")]
[Route("api/v1/me/timesheets")]
public class MeTimesheetsController(ITimesheetService service) : ControllerBase
{
    private Guid CurrentMemberId => HttpContext.GetCurrentMemberId();

    [HttpGet]
    public async Task<IActionResult> GetByMonth([FromQuery] int year, [FromQuery] int month)
        => Ok(await service.GetByMonthAsync(CurrentMemberId, year, month));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTimesheetEntryRequest req)
    {
        try
        {
            var result = await service.CreateAsync(CurrentMemberId, req);
            _ = WebSocketMiddleware.BroadcastAsync("timesheet_entry_created", new { memberId = CurrentMemberId, entry = result });
            return Created("", result);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("{entryId:guid}")]
    public async Task<IActionResult> Update(Guid entryId, [FromBody] UpdateTimesheetEntryRequest req)
    {
        try
        {
            var result = await service.UpdateAsync(CurrentMemberId, entryId, req);
            if (result is null) return NotFound();
            _ = WebSocketMiddleware.BroadcastAsync("timesheet_entry_updated", new { memberId = CurrentMemberId, entry = result });
            return Ok(result);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpDelete("{entryId:guid}")]
    public async Task<IActionResult> Delete(Guid entryId)
    {
        var success = await service.DeleteAsync(CurrentMemberId, entryId);
        if (!success) return NotFound();
        _ = WebSocketMiddleware.BroadcastAsync("timesheet_entry_deleted", new { memberId = CurrentMemberId, entryId });
        return NoContent();
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] int year, [FromQuery] int month)
    {
        var bytes = await service.ExportMonthAsync(CurrentMemberId, year, month);
        return File(bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"timesheet-{year:D4}-{month:D2}.xlsx");
    }
}
