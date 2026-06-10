using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.WinOfTheWeek;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("win-of-week")]
[Route("api/v1/win-series")]
public class WinSeriesController(WinSeriesService service, AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await service.GetAllAsync();
        return Ok(result);
    }

    [HttpPost]
    [RequireFeature("wow-host")]
    public async Task<IActionResult> Create([FromBody] CreateWinSeriesRequest request)
    {
        var memberId = GetCurrentMemberId();
        var result = await service.CreateAsync(request.Name, memberId);
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
