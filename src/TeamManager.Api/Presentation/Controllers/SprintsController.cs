using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.Sprint;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/sprints")]
public class SprintsController(ISprintService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? piId, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
        => Ok(await service.GetAllAsync(piId, from, to));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await service.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSprintRequest request)
    {
        var result = await service.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateSprintRequest request)
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

    [HttpPost("{id:guid}/initialize-members")]
    public async Task<IActionResult> InitializeMembers(Guid id)
    {
        var count = await service.InitializeMembersAsync(id);
        return Ok(new { addedCount = count });
    }

    [HttpPatch("{id:guid}/retro")]
    public async Task<IActionResult> UpdateRetro(Guid id, [FromBody] UpdateRetroRequest request)
    {
        var result = await service.UpdateRetroAsync(id, request);
        return result is null ? NotFound() : Ok(result);
    }
}
