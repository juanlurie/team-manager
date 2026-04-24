using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.Achievement;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/achievements")]
public class AchievementsController(IAchievementService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await service.GetAllAsync());

    [HttpGet("member/{memberId:guid}")]
    public async Task<IActionResult> GetForMember(Guid memberId)
        => Ok(await service.GetForMemberAsync(memberId));

    [HttpPost("award")]
    public async Task<IActionResult> Award([FromBody] AwardAchievementRequest request)
        => Ok(await service.AwardAsync(request));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Revoke(Guid id)
        => await service.RevokeAsync(id) ? NoContent() : NotFound();
}
