using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.ProcessFlow;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("process-flows")]
[Route("api/v1/process-flows")]
public class ProcessFlowController(ProcessFlowService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetSessions()
    {
        return Ok(await service.GetSessionsAsync());
    }

    [HttpPost]
    public async Task<IActionResult> CreateSession([FromBody] CreateProcessFlowSessionRequest request)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var session = await service.CreateSessionAsync(memberId.Value, request);
        return CreatedAtAction(nameof(GetSession), new { id = session.Id }, session);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetSession(Guid id)
    {
        var session = await service.GetSessionAsync(id);
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
    public async Task<IActionResult> AddNode(Guid id, [FromBody] AddProcessFlowNodeRequest request)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var node = await service.AddNodeAsync(id, memberId.Value, request);
        if (node is null) return NotFound();
        return Ok(node);
    }

    [HttpPatch("{id:guid}/nodes/{nodeId:guid}/position")]
    public async Task<IActionResult> UpdateNodePosition(Guid id, Guid nodeId, [FromBody] UpdateProcessFlowNodePositionRequest request)
    {
        var success = await service.UpdateNodePositionAsync(id, nodeId, request);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPatch("{id:guid}/nodes/{nodeId:guid}/size")]
    public async Task<IActionResult> UpdateNodeSize(Guid id, Guid nodeId, [FromBody] UpdateProcessFlowNodeSizeRequest request)
    {
        var success = await service.UpdateNodeSizeAsync(id, nodeId, request);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPatch("{id:guid}/nodes/{nodeId:guid}/color")]
    public async Task<IActionResult> UpdateNodeColor(Guid id, Guid nodeId, [FromBody] UpdateProcessFlowNodeColorRequest request)
    {
        var success = await service.UpdateNodeColorAsync(id, nodeId, request);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPatch("{id:guid}/nodes/{nodeId:guid}/text")]
    public async Task<IActionResult> UpdateNodeText(Guid id, Guid nodeId, [FromBody] UpdateProcessFlowNodeTextRequest request)
    {
        var success = await service.UpdateNodeTextAsync(id, nodeId, request);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpDelete("{id:guid}/nodes/{nodeId:guid}")]
    public async Task<IActionResult> DeleteNode(Guid id, Guid nodeId)
    {
        var success = await service.DeleteNodeAsync(id, nodeId);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPost("{id:guid}/edges")]
    public async Task<IActionResult> AddEdge(Guid id, [FromBody] AddProcessFlowEdgeRequest request)
    {
        var edge = await service.AddEdgeAsync(id, request);
        if (edge is null) return BadRequest(new { error = "Invalid edge: nodes must exist, differ, and not already be connected." });
        return Ok(edge);
    }

    [HttpPatch("{id:guid}/edges/{edgeId:guid}/waypoints")]
    public async Task<IActionResult> UpdateEdgeWaypoints(Guid id, Guid edgeId, [FromBody] UpdateProcessFlowEdgeWaypointsRequest request)
    {
        var success = await service.UpdateEdgeWaypointsAsync(id, edgeId, request);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpDelete("{id:guid}/edges/{edgeId:guid}")]
    public async Task<IActionResult> DeleteEdge(Guid id, Guid edgeId)
    {
        var success = await service.DeleteEdgeAsync(id, edgeId);
        if (!success) return NotFound();
        return NoContent();
    }

    private Guid? GetCurrentMemberId()
    {
        var claim = User.FindFirst("TMID")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
