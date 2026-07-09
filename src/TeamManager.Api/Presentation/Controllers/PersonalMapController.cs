using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.PersonalMap;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("personal-maps")]
[Route("api/v1/personal-maps")]
public class PersonalMapController(PersonalMapService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetSessions()
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        return Ok(await service.GetSessionsAsync(memberId.Value));
    }

    [HttpPost]
    public async Task<IActionResult> CreateSession([FromBody] CreatePersonalMapSessionRequest request)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var session = await service.CreateSessionAsync(memberId.Value, request);
        return CreatedAtAction(nameof(GetSession), new { id = session.Id }, session);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetSession(Guid id)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var session = await service.GetSessionAsync(id, memberId.Value);
        if (session is null) return NotFound();
        return Ok(session);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteSession(Guid id)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var success = await service.DeleteSessionAsync(id, memberId.Value);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPost("{id:guid}/nodes")]
    public async Task<IActionResult> AddNode(Guid id, [FromBody] AddPersonalMapNodeRequest request)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var node = await service.AddNodeAsync(id, memberId.Value, request);
        if (node is null) return NotFound();
        return Ok(node);
    }

    [HttpPatch("{id:guid}/nodes/{nodeId:guid}/position")]
    public async Task<IActionResult> UpdateNodePosition(Guid id, Guid nodeId, [FromBody] UpdatePersonalMapNodePositionRequest request)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var success = await service.UpdateNodePositionAsync(id, memberId.Value, nodeId, request);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPatch("{id:guid}/nodes/{nodeId:guid}/size")]
    public async Task<IActionResult> UpdateNodeSize(Guid id, Guid nodeId, [FromBody] UpdatePersonalMapNodeSizeRequest request)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var success = await service.UpdateNodeSizeAsync(id, memberId.Value, nodeId, request);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPatch("{id:guid}/nodes/{nodeId:guid}/text")]
    public async Task<IActionResult> UpdateNodeText(Guid id, Guid nodeId, [FromBody] UpdatePersonalMapNodeTextRequest request)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var success = await service.UpdateNodeTextAsync(id, memberId.Value, nodeId, request);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpDelete("{id:guid}/nodes/{nodeId:guid}")]
    public async Task<IActionResult> DeleteNode(Guid id, Guid nodeId)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var success = await service.DeleteNodeAsync(id, memberId.Value, nodeId);
        if (!success) return NotFound();
        return NoContent();
    }

    private Guid? GetCurrentMemberId()
    {
        var claim = User.FindFirst("TMID")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
