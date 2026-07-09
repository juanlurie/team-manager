using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.ProcessFlow;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Application.Services;

// Flowchart-style boards: nodes connected by directed edges, positioned freely on a shared
// pan/zoom canvas. Broadcasts go through the generic BroadcastToBoardSessionAsync room (not
// retro's BroadcastToRetroSessionAsync) -- see WebSocketMiddleware's BoardSessionId.
public class ProcessFlowService(AppDbContext db)
{
    public async Task<List<ProcessFlowSessionSummaryDto>> GetSessionsAsync()
    {
        return await db.ProcessFlowSessions
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new ProcessFlowSessionSummaryDto
            {
                Id = s.Id,
                Title = s.Title,
                CreatedByMemberId = s.CreatedByMemberId,
                CreatedByName = db.TeamMembers.Where(m => m.Id == s.CreatedByMemberId)
                    .Select(m => (m.FirstName + " " + m.LastName).Trim()).FirstOrDefault() ?? "",
                NodeCount = s.Nodes.Count,
                CreatedAt = s.CreatedAt,
            })
            .ToListAsync();
    }

    public async Task<ProcessFlowSessionDto> CreateSessionAsync(Guid memberId, CreateProcessFlowSessionRequest req)
    {
        var session = new ProcessFlowSession
        {
            Title = string.IsNullOrWhiteSpace(req.Title)
                ? $"Process Flow — {DateTimeOffset.Now:MMM d, yyyy}"
                : req.Title.Trim(),
            CreatedByMemberId = memberId,
        };
        db.ProcessFlowSessions.Add(session);
        await db.SaveChangesAsync();
        return ToDto(session);
    }

    public async Task<ProcessFlowSessionDto?> GetSessionAsync(Guid sessionId)
    {
        var session = await db.ProcessFlowSessions
            .Include(s => s.Nodes)
            .Include(s => s.Edges)
            .FirstOrDefaultAsync(s => s.Id == sessionId);
        return session is null ? null : ToDto(session);
    }

    public async Task<bool> DeleteSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.ProcessFlowSessions.FindAsync(sessionId);
        if (session is null || session.CreatedByMemberId != memberId) return false;

        db.ProcessFlowSessions.Remove(session);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<ProcessFlowNodeDto?> AddNodeAsync(Guid sessionId, Guid memberId, AddProcessFlowNodeRequest req)
    {
        var session = await db.ProcessFlowSessions.FindAsync(sessionId);
        if (session is null) return null;

        var node = new ProcessFlowNode
        {
            SessionId = sessionId,
            Label = string.IsNullOrWhiteSpace(req.Label) ? "Step" : req.Label.Trim(),
            PositionX = req.PositionX,
            PositionY = req.PositionY,
            Color = req.Color,
            CreatedByMemberId = memberId,
        };
        db.ProcessFlowNodes.Add(node);
        await db.SaveChangesAsync();

        var dto = ToDto(node);
        _ = WebSocketMiddleware.BroadcastToBoardSessionAsync("process_flow_node_added", sessionId.ToString(), new { sessionId, node = dto });
        return dto;
    }

    public async Task<bool> UpdateNodePositionAsync(Guid sessionId, Guid nodeId, UpdateProcessFlowNodePositionRequest req)
    {
        var node = await db.ProcessFlowNodes.FirstOrDefaultAsync(n => n.Id == nodeId && n.SessionId == sessionId);
        if (node is null) return false;

        node.PositionX = req.PositionX;
        node.PositionY = req.PositionY;
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastToBoardSessionAsync("process_flow_node_moved", sessionId.ToString(),
            new { sessionId, nodeId, positionX = req.PositionX, positionY = req.PositionY });
        return true;
    }

    public async Task<bool> UpdateNodeSizeAsync(Guid sessionId, Guid nodeId, UpdateProcessFlowNodeSizeRequest req)
    {
        var node = await db.ProcessFlowNodes.FirstOrDefaultAsync(n => n.Id == nodeId && n.SessionId == sessionId);
        if (node is null) return false;

        node.Width = Math.Clamp(req.Width, 80, 640);
        node.Height = Math.Clamp(req.Height, 48, 480);
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastToBoardSessionAsync("process_flow_node_resized", sessionId.ToString(),
            new { sessionId, nodeId, width = node.Width, height = node.Height });
        return true;
    }

    public async Task<bool> UpdateNodeColorAsync(Guid sessionId, Guid nodeId, UpdateProcessFlowNodeColorRequest req)
    {
        var node = await db.ProcessFlowNodes.FirstOrDefaultAsync(n => n.Id == nodeId && n.SessionId == sessionId);
        if (node is null) return false;

        node.Color = string.IsNullOrWhiteSpace(req.Color) ? null : req.Color.Trim();
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastToBoardSessionAsync("process_flow_node_color_changed", sessionId.ToString(),
            new { sessionId, nodeId, color = node.Color });
        return true;
    }

    public async Task<bool> UpdateNodeTextAsync(Guid sessionId, Guid nodeId, UpdateProcessFlowNodeTextRequest req)
    {
        var node = await db.ProcessFlowNodes.FirstOrDefaultAsync(n => n.Id == nodeId && n.SessionId == sessionId);
        if (node is null) return false;

        node.Label = string.IsNullOrWhiteSpace(req.Label) ? node.Label : req.Label.Trim();
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastToBoardSessionAsync("process_flow_node_text_updated", sessionId.ToString(),
            new { sessionId, nodeId, label = node.Label });
        return true;
    }

    /// <summary>Deletes a node and any edge touching it. No FK-level cascade from node to edge
    /// (an edge has two FKs into the same node table, so a DB cascade would be ambiguous) --
    /// this is the single place that keeps the edge set consistent with the node set.</summary>
    public async Task<bool> DeleteNodeAsync(Guid sessionId, Guid nodeId)
    {
        var node = await db.ProcessFlowNodes.FirstOrDefaultAsync(n => n.Id == nodeId && n.SessionId == sessionId);
        if (node is null) return false;

        var touchingEdges = await db.ProcessFlowEdges
            .Where(e => e.SessionId == sessionId && (e.FromNodeId == nodeId || e.ToNodeId == nodeId))
            .ToListAsync();
        var removedEdgeIds = touchingEdges.Select(e => e.Id).ToList();
        db.ProcessFlowEdges.RemoveRange(touchingEdges);
        db.ProcessFlowNodes.Remove(node);
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastToBoardSessionAsync("process_flow_node_deleted", sessionId.ToString(),
            new { sessionId, nodeId, removedEdgeIds });
        return true;
    }

    public async Task<ProcessFlowEdgeDto?> AddEdgeAsync(Guid sessionId, AddProcessFlowEdgeRequest req)
    {
        if (req.FromNodeId == req.ToNodeId) return null;

        var nodeCount = await db.ProcessFlowNodes
            .CountAsync(n => n.SessionId == sessionId && (n.Id == req.FromNodeId || n.Id == req.ToNodeId));
        if (nodeCount != 2) return null;

        var alreadyExists = await db.ProcessFlowEdges.AnyAsync(e =>
            e.SessionId == sessionId && e.FromNodeId == req.FromNodeId && e.ToNodeId == req.ToNodeId);
        if (alreadyExists) return null;

        var edge = new ProcessFlowEdge
        {
            SessionId = sessionId,
            FromNodeId = req.FromNodeId,
            ToNodeId = req.ToNodeId,
            Label = string.IsNullOrWhiteSpace(req.Label) ? null : req.Label.Trim(),
        };
        db.ProcessFlowEdges.Add(edge);
        await db.SaveChangesAsync();

        var dto = ToDto(edge);
        _ = WebSocketMiddleware.BroadcastToBoardSessionAsync("process_flow_edge_added", sessionId.ToString(), new { sessionId, edge = dto });
        return dto;
    }

    public async Task<bool> UpdateEdgeWaypointsAsync(Guid sessionId, Guid edgeId, UpdateProcessFlowEdgeWaypointsRequest req)
    {
        var edge = await db.ProcessFlowEdges.FirstOrDefaultAsync(e => e.Id == edgeId && e.SessionId == sessionId);
        if (edge is null) return false;

        // Cap the number of bends so a malicious/buggy client can't store an unbounded blob.
        var points = (req.Waypoints ?? []).Take(24).ToList();
        edge.Waypoints = points.Count == 0 ? null : JsonSerializer.Serialize(points, WaypointJson);
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastToBoardSessionAsync("process_flow_edge_reshaped", sessionId.ToString(),
            new { sessionId, edgeId, waypoints = points });
        return true;
    }

    /// <summary>Re-points an existing edge onto (possibly) different endpoints when the user drags
    /// an arrow end onto another node. Resets any manual waypoints, since old bends rarely make
    /// sense against new endpoints -- the client re-routes it fresh.</summary>
    public async Task<bool> UpdateEdgeEndpointsAsync(Guid sessionId, Guid edgeId, UpdateProcessFlowEdgeEndpointsRequest req)
    {
        if (req.FromNodeId == req.ToNodeId) return false;

        var edge = await db.ProcessFlowEdges.FirstOrDefaultAsync(e => e.Id == edgeId && e.SessionId == sessionId);
        if (edge is null) return false;

        var nodeCount = await db.ProcessFlowNodes
            .CountAsync(n => n.SessionId == sessionId && (n.Id == req.FromNodeId || n.Id == req.ToNodeId));
        if (nodeCount != 2) return false;

        var duplicate = await db.ProcessFlowEdges.AnyAsync(e =>
            e.Id != edgeId && e.SessionId == sessionId && e.FromNodeId == req.FromNodeId && e.ToNodeId == req.ToNodeId);
        if (duplicate) return false;

        edge.FromNodeId = req.FromNodeId;
        edge.ToNodeId = req.ToNodeId;
        edge.Waypoints = null;
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastToBoardSessionAsync("process_flow_edge_endpoints_changed", sessionId.ToString(),
            new { sessionId, edgeId, fromNodeId = edge.FromNodeId, toNodeId = edge.ToNodeId });
        return true;
    }

    public async Task<bool> UpdateEdgeColorAsync(Guid sessionId, Guid edgeId, UpdateProcessFlowEdgeColorRequest req)
    {
        var edge = await db.ProcessFlowEdges.FirstOrDefaultAsync(e => e.Id == edgeId && e.SessionId == sessionId);
        if (edge is null) return false;

        edge.Color = string.IsNullOrWhiteSpace(req.Color) ? null : req.Color.Trim();
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastToBoardSessionAsync("process_flow_edge_color_changed", sessionId.ToString(),
            new { sessionId, edgeId, color = edge.Color });
        return true;
    }

    public async Task<bool> DeleteEdgeAsync(Guid sessionId, Guid edgeId)
    {
        var edge = await db.ProcessFlowEdges.FirstOrDefaultAsync(e => e.Id == edgeId && e.SessionId == sessionId);
        if (edge is null) return false;

        db.ProcessFlowEdges.Remove(edge);
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastToBoardSessionAsync("process_flow_edge_deleted", sessionId.ToString(), new { sessionId, edgeId });
        return true;
    }

    private static ProcessFlowSessionDto ToDto(ProcessFlowSession session) => new()
    {
        Id = session.Id,
        Title = session.Title,
        CreatedByMemberId = session.CreatedByMemberId,
        CreatedAt = session.CreatedAt,
        Nodes = session.Nodes.Select(ToDto).ToList(),
        Edges = session.Edges.Select(ToDto).ToList(),
    };

    private static ProcessFlowNodeDto ToDto(ProcessFlowNode node) => new()
    {
        Id = node.Id,
        SessionId = node.SessionId,
        Label = node.Label,
        PositionX = node.PositionX,
        PositionY = node.PositionY,
        Width = node.Width,
        Height = node.Height,
        Color = node.Color,
        CreatedByMemberId = node.CreatedByMemberId,
    };

    private static ProcessFlowEdgeDto ToDto(ProcessFlowEdge edge) => new()
    {
        Id = edge.Id,
        SessionId = edge.SessionId,
        FromNodeId = edge.FromNodeId,
        ToNodeId = edge.ToNodeId,
        Label = edge.Label,
        Color = edge.Color,
        Waypoints = DeserializeWaypoints(edge.Waypoints),
    };

    private static readonly JsonSerializerOptions WaypointJson = new(JsonSerializerDefaults.Web);

    private static List<ProcessFlowPointDto> DeserializeWaypoints(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return JsonSerializer.Deserialize<List<ProcessFlowPointDto>>(json, WaypointJson) ?? []; }
        catch { return []; }
    }
}
