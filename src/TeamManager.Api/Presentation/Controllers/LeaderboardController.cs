using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.Leaderboard;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/leaderboard")]
public class LeaderboardController(ILeaderboardService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get() => Ok(await service.GetLeaderboardAsync());

    [HttpGet("member/{memberId:guid}")]
    public async Task<IActionResult> GetMember(Guid memberId)
    {
        var result = await service.GetMemberStatsAsync(memberId);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("award")]
    public async Task<IActionResult> Award([FromBody] AwardPointsRequest request)
    {
        await service.AwardPointsAsync(request);
        return NoContent();
    }

    [HttpDelete("award/{id:guid}")]
    public async Task<IActionResult> RevokeAward(Guid id)
        => await service.RevokePointAwardAsync(id) ? NoContent() : NotFound();
}
