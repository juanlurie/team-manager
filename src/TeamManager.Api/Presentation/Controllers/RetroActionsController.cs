using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.RetroAction;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("discussion")]
[Route("api/v1/retro-actions")]
public class RetroActionsController(IRetroActionService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetBySprint([FromQuery] Guid sprintId)
        => Ok(await service.GetBySprintAsync(sprintId));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRetroActionRequest request)
        => Created("", await service.CreateAsync(request));

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateRetroActionRequest request)
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
}
