using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.Timesheet;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

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
        try { return Created("", await service.CreateAsync(memberId, req)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("{entryId:guid}")]
    public async Task<IActionResult> Update(Guid memberId, Guid entryId, [FromBody] UpdateTimesheetEntryRequest req)
    {
        try
        {
            var result = await service.UpdateAsync(memberId, entryId, req);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpDelete("{entryId:guid}")]
    public async Task<IActionResult> Delete(Guid memberId, Guid entryId)
    {
        var success = await service.DeleteAsync(memberId, entryId);
        return success ? NoContent() : NotFound();
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
