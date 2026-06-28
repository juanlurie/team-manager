using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("wordle")]
[Route("api/v1/wordle/royale")]
public class WordleRoyaleController(WordleRoyaleService royaleService, AppDbContext db) : ControllerBase
{
    [HttpGet("standings")]
    public async Task<IActionResult> GetStandings()
    {
        var result = await royaleService.GetStandingsAsync();
        return Ok(result);
    }

    [HttpGet("week")]
    public async Task<IActionResult> GetWeeklyMatches([FromQuery] int? week, [FromQuery] int? year)
    {
        var result = await royaleService.GetWeeklyMatchesAsync(week, year);
        return Ok(result);
    }

    private Guid GetCurrentMemberId()
    {
        if (Guid.TryParse(User.FindFirst("TMID")?.Value, out var tmid))
            return tmid;

        if (Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var nameId))
            return nameId;

        var firstMember = db.Set<Domain.Entities.TeamMember>()
            .Where(m => m.IsActive)
            .OrderBy(m => m.CreatedAt)
            .Select(m => (Guid?)m.Id)
            .FirstOrDefault();

        return firstMember ?? Guid.Empty;
    }
}
