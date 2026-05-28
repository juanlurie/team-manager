using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.Feature;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("features")]
[Route("api/v1/sprints/{sprintId:guid}/features")]
public class FeaturesController(IFeatureService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(Guid sprintId)
        => Ok(await service.GetBySprintAsync(sprintId));

    [HttpPost]
    public async Task<IActionResult> Create(Guid sprintId, [FromBody] CreateFeatureRequest request)
        => Created("", await service.CreateAsync(sprintId, request));

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid sprintId, Guid id, [FromBody] CreateFeatureRequest request)
    {
        var result = await service.UpdateAsync(id, request);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid sprintId, Guid id)
    {
        var success = await service.DeleteAsync(id);
        return success ? NoContent() : NotFound();
    }

    [HttpPatch("{id:guid}/toggle-active")]
    public async Task<IActionResult> ToggleActive(Guid sprintId, Guid id)
    {
        var result = await service.ToggleActiveAsync(id);
        return result is null ? NotFound() : Ok(result);
    }
}
