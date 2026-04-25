using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/features")]
public class AllFeaturesController(IFeatureService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status = null, [FromQuery] Guid? piId = null)
        => Ok(await service.GetAllAsync(status, piId));

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> SetStatus(Guid id, [FromBody] SetStatusRequest request)
    {
        var result = await service.SetStatusAsync(id, request.Status);
        return result is null ? NotFound() : Ok(result);
    }

    public record SetStatusRequest(string Status);
}
