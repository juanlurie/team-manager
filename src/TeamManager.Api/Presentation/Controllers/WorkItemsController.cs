using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.WorkItem;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
public class WorkItemsController(IWorkItemService service) : ControllerBase
{
    [HttpGet("api/v1/sprint-members/{sprintMemberId:guid}/work-items")]
    public async Task<IActionResult> GetBySprintMember(Guid sprintMemberId)
        => Ok(await service.GetBySprintMemberAsync(sprintMemberId));

    [HttpPost("api/v1/sprint-members/{sprintMemberId:guid}/work-items")]
    public async Task<IActionResult> Create(Guid sprintMemberId, [FromBody] CreateWorkItemRequest request)
    {
        var result = await service.CreateAsync(sprintMemberId, request);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpGet("api/v1/work-items/{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await service.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPut("api/v1/work-items/{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateWorkItemRequest request)
    {
        var result = await service.UpdateAsync(id, request);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPatch("api/v1/work-items/{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateWorkItemStatusRequest request)
    {
        var result = await service.UpdateStatusAsync(id, request.Status);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("api/v1/work-items/{id:guid}/carry-over")]
    public async Task<IActionResult> CarryOver(Guid id, [FromBody] CarryOverRequest request)
    {
        var result = await service.CarryOverAsync(id, request.TargetSprintId);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("api/v1/work-items/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await service.DeleteAsync(id);
        return success ? NoContent() : NotFound();
    }
}
