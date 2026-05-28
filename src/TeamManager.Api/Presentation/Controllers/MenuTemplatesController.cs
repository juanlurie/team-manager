using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.CoffeeRun;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/menu-templates")]
public class MenuTemplatesController(ICoffeeRunService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? scope = null,
        [FromQuery] bool? includeArchived = null)
        => Ok(await service.GetTemplatesAsync(page, pageSize, scope, includeArchived));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateMenuTemplateRequest request)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var memberId))
            return Unauthorized();

        var result = await service.CreateTemplateAsync(memberId, request);
        return Created("", result);
    }

    [HttpPost("import")]
    public async Task<IActionResult> Import([FromBody] ImportMenuTemplateRequest request)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var memberId))
            return Unauthorized();

        var result = await service.ImportTemplateAsync(memberId, request);
        return Created("", result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var memberId))
            return Unauthorized();

        try
        {
            var result = await service.GetTemplateDetailAsync(id, memberId);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMenuTemplateRequest request)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var memberId))
            return Unauthorized();

        try
        {
            var result = await service.UpdateTemplateAsync(id, memberId, request);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var memberId))
            return Unauthorized();

        var isTeamLead = User.IsInRole("TeamLead");
        var success = await service.DeleteTemplateAsync(id, memberId, isTeamLead);
        return success ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/archive")]
    public async Task<IActionResult> Archive(Guid id)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var memberId))
            return Unauthorized();

        var isTeamLead = User.IsInRole("TeamLead");
        var success = await service.ArchiveTemplateAsync(id, memberId, isTeamLead);
        return success ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/restore")]
    public async Task<IActionResult> Restore(Guid id)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var memberId))
            return Unauthorized();

        var isTeamLead = User.IsInRole("TeamLead");
        var success = await service.RestoreTemplateAsync(id, memberId, isTeamLead);
        return success ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/items")]
    public async Task<IActionResult> AddItem(Guid id, [FromBody] CreateTemplateItemRequest request)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var memberId))
            return Unauthorized();

        try
        {
            var result = await service.AddTemplateItemAsync(id, memberId, request);
            return Created("", result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPut("{id:guid}/items/{itemId:guid}")]
    public async Task<IActionResult> UpdateItem(Guid id, Guid itemId, [FromBody] UpdateTemplateItemRequest request)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var memberId))
            return Unauthorized();

        try
        {
            var result = await service.UpdateTemplateItemAsync(id, itemId, memberId, request);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpDelete("{id:guid}/items/{itemId:guid}")]
    public async Task<IActionResult> DeleteItem(Guid id, Guid itemId)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var memberId))
            return Unauthorized();

        var success = await service.DeleteTemplateItemAsync(id, itemId, memberId);
        return success ? NoContent() : NotFound();
    }
}
