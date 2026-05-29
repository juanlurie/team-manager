using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.RetroAction;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("sprints")]
[Route("api/v1/retro-actions")]
public class RetroActionsController(IRetroActionService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetBySprint([FromQuery] Guid sprintId)
        => Ok(await service.GetBySprintAsync(sprintId));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRetroActionRequest request)
    {
        var result = await service.CreateAsync(request);
        _ = WebSocketMiddleware.BroadcastAsync("retro_action_created", new { sprintId = request.SprintId, retroAction = result });
        return Created("", result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateRetroActionRequest request)
    {
        var result = await service.UpdateAsync(id, request);
        if (result is not null)
            _ = WebSocketMiddleware.BroadcastAsync("retro_action_updated", new { sprintId = request.SprintId, retroAction = result });
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await service.DeleteAsync(id);
        if (success)
            _ = WebSocketMiddleware.BroadcastAsync("retro_action_deleted", new { retroActionId = id });
        return success ? NoContent() : NotFound();
    }
}
