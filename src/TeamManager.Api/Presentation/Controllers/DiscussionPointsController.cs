using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.DiscussionPoint;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/discussion-points")]
public class DiscussionPointsController(IDiscussionPointService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? sprintId = null)
        => Ok(await service.GetAllAsync(sprintId));

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
}
