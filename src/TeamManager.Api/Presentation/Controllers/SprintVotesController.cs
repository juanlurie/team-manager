using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.Vote;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("scrum-poker")]
[Route("api/v1/sprints/{sprintId:guid}/votes")]
public class SprintVotesController(ISprintVoteService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetVotes(Guid sprintId)
        => Ok(await service.GetVotesAsync(sprintId));

    [HttpPost]
    public async Task<IActionResult> CastVote(Guid sprintId, [FromBody] CastVoteRequest request)
        => Ok(await service.CastVoteAsync(sprintId, request));

    [HttpPost("award-mvp")]
    public async Task<IActionResult> AwardMvp(Guid sprintId)
    {
        try { return Ok(await service.AwardMvpAsync(sprintId)); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }
}
