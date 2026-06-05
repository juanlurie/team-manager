using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.Timesheet;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

public record EnqueueSyncRequest(Guid[] EntryIds);

[ApiController]
[RequireFeature("team")]
[Route("api/v1/team-members/{memberId:guid}/timesheets")]
public class TimesheetsController(ITimesheetService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetByMonth(Guid memberId, [FromQuery] int year, [FromQuery] int month)
        => Ok(await service.GetByMonthAsync(memberId, year, month));

    [HttpPost]
    public async Task<IActionResult> Create(Guid memberId, [FromBody] CreateTimesheetEntryRequest req)
    {
        try
        {
            var result = await service.CreateAsync(memberId, req);
            _ = WebSocketMiddleware.BroadcastAsync("timesheet_entry_created", new { memberId, entry = result });
            return Created("", result);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("{entryId:guid}")]
    public async Task<IActionResult> Update(Guid memberId, Guid entryId, [FromBody] UpdateTimesheetEntryRequest req)
    {
        try
        {
            var result = await service.UpdateAsync(memberId, entryId, req);
            if (result is null) return NotFound();
            _ = WebSocketMiddleware.BroadcastAsync("timesheet_entry_updated", new { memberId, entry = result });
            return Ok(result);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpDelete("{entryId:guid}")]
    public async Task<IActionResult> Delete(Guid memberId, Guid entryId)
    {
        var success = await service.DeleteAsync(memberId, entryId);
        if (!success) return NotFound();
        _ = WebSocketMiddleware.BroadcastAsync("timesheet_entry_deleted", new { memberId, entryId });
        return NoContent();
    }

    [HttpPost("enqueue-sync")]
    public async Task<IActionResult> EnqueueSync(Guid memberId, [FromBody] EnqueueSyncRequest req)
    {
        var count = await service.EnqueueSyncAsync(memberId, req.EntryIds);
        return Ok(new { enqueued = count });
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export(Guid memberId, [FromQuery] int year, [FromQuery] int month)
    {
        var bytes = await service.ExportMonthAsync(memberId, year, month);
        return File(bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"timesheet-{year:D4}-{month:D2}.xlsx");
    }
}
