using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.DiscussionPoint;
using TeamManager.Api.Application.DTOs.DiscussionTask;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("discussion")]
[Route("api/v1/discussion-points")]
public class DiscussionPointsController(IDiscussionPointService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await service.GetAllAsync());

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDiscussionPointRequest request)
        => Created("", await service.CreateAsync(request));

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateDiscussionPointRequest request)
    {
        var result = await service.UpdateAsync(id, request);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await service.DeleteAsync(id);
        return success ? NoContent() : NotFound();
    }

    // Task endpoints
    [HttpGet("{discussionPointId:guid}/tasks")]
    public async Task<IActionResult> GetTasks(Guid discussionPointId)
        => Ok(await service.GetTasksAsync(discussionPointId));

    [HttpPost("{discussionPointId:guid}/tasks")]
    public async Task<IActionResult> CreateTask(Guid discussionPointId, [FromBody] CreateDiscussionTaskRequest request)
        => Created("", await service.CreateTaskAsync(discussionPointId, request));

    [HttpPut("{discussionPointId:guid}/tasks/{taskId:guid}")]
    public async Task<IActionResult> UpdateTask(Guid discussionPointId, Guid taskId, [FromBody] CreateDiscussionTaskRequest request)
    {
        var result = await service.UpdateTaskAsync(discussionPointId, taskId, request);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{discussionPointId:guid}/tasks/{taskId:guid}")]
    public async Task<IActionResult> DeleteTask(Guid discussionPointId, Guid taskId)
    {
        var success = await service.DeleteTaskAsync(discussionPointId, taskId);
        return success ? NoContent() : NotFound();
    }

    [HttpPost("{discussionPointId:guid}/tasks/{taskId:guid}/toggle")]
    public async Task<IActionResult> ToggleTask(Guid discussionPointId, Guid taskId)
    {
        var result = await service.ToggleTaskAsync(discussionPointId, taskId);
        return result is null ? NotFound() : Ok(result);
    }
}
