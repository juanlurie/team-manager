using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.LeaveRecord;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/leave-records")]
public class LeaveRecordsController(ILeaveService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? teamMemberId,
        [FromQuery] Guid? sprintId,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to)
        => Ok(await service.GetAllAsync(teamMemberId, sprintId, from, to));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLeaveRecordRequest request)
    {
        var result = await service.CreateAsync(request);
        return Created("", result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateLeaveRecordRequest request)
    {
        var result = await service.UpdateAsync(id, request);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("import")]
    public async Task<IActionResult> Import([FromBody] ImportLeaveRequest request)
        => Ok(await service.ImportAsync(request));

    [HttpPost("fetch-preview")]
    public async Task<IActionResult> FetchPreview([FromBody] FetchLeaveRequest request)
    {
        try { return Ok(await service.FetchPreviewAsync(request)); }
        catch (InvalidOperationException ex) { return BadRequest(new { detail = ex.Message }); }
    }

    [HttpPost("fetch")]
    public async Task<IActionResult> FetchAndImport([FromBody] FetchLeaveRequest request)
    {
        try { return Ok(await service.FetchAndImportAsync(request)); }
        catch (InvalidOperationException ex) { return BadRequest(new { detail = ex.Message }); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await service.DeleteAsync(id);
        return success ? NoContent() : NotFound();
    }
}
