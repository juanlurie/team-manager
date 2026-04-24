using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.Wheel;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/wheels")]
public class WheelsController(IWheelService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await service.GetAllAsync());

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateWheelRequest request)
        => Created("", await service.CreateAsync(request));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await service.DeleteAsync(id);
        return success ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/participants/{memberId:guid}")]
    public async Task<IActionResult> AddParticipant(Guid id, Guid memberId)
    {
        var result = await service.AddParticipantAsync(id, memberId);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}/participants/{memberId:guid}")]
    public async Task<IActionResult> RemoveParticipant(Guid id, Guid memberId)
    {
        var result = await service.RemoveParticipantAsync(id, memberId);
        return result is null ? NotFound() : Ok(result);
    }
}
