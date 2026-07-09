using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.PersonalMap;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Application.Services;

// Freeform per-person mind-map/roadmap boards -- nodes only, no connectors. Unlike retro/process
// flows, these are scoped to their creator: list/get/delete all require ownership, since a
// personal map isn't a shared team artifact. Real-time sync still goes through the generic
// BroadcastToBoardSessionAsync room (same as process flows) so a second tab/device for the same
// person stays in sync.
public class PersonalMapService(AppDbContext db)
{
    public async Task<List<PersonalMapSessionSummaryDto>> GetSessionsAsync(Guid memberId)
    {
        return await db.PersonalMapSessions
            .Where(s => s.CreatedByMemberId == memberId)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new PersonalMapSessionSummaryDto
            {
                Id = s.Id,
                Title = s.Title,
                NodeCount = s.Nodes.Count,
                CreatedAt = s.CreatedAt,
            })
            .ToListAsync();
    }

    public async Task<PersonalMapSessionDto> CreateSessionAsync(Guid memberId, CreatePersonalMapSessionRequest req)
    {
        var session = new PersonalMapSession
        {
            Title = string.IsNullOrWhiteSpace(req.Title)
                ? $"Personal Map — {DateTimeOffset.Now:MMM d, yyyy}"
                : req.Title.Trim(),
            CreatedByMemberId = memberId,
        };
        db.PersonalMapSessions.Add(session);
        await db.SaveChangesAsync();
        return ToDto(session);
    }

    public async Task<PersonalMapSessionDto?> GetSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.PersonalMapSessions
            .Include(s => s.Nodes)
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.CreatedByMemberId == memberId);
        return session is null ? null : ToDto(session);
    }

    public async Task<bool> DeleteSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.PersonalMapSessions.FirstOrDefaultAsync(s => s.Id == sessionId && s.CreatedByMemberId == memberId);
        if (session is null) return false;

        db.PersonalMapSessions.Remove(session);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<PersonalMapNodeDto?> AddNodeAsync(Guid sessionId, Guid memberId, AddPersonalMapNodeRequest req)
    {
        var owns = await db.PersonalMapSessions.AnyAsync(s => s.Id == sessionId && s.CreatedByMemberId == memberId);
        if (!owns) return null;

        var node = new PersonalMapNode
        {
            SessionId = sessionId,
            Label = string.IsNullOrWhiteSpace(req.Label) ? "Idea" : req.Label.Trim(),
            PositionX = req.PositionX,
            PositionY = req.PositionY,
            Color = req.Color,
        };
        db.PersonalMapNodes.Add(node);
        await db.SaveChangesAsync();

        var dto = ToDto(node);
        _ = WebSocketMiddleware.BroadcastToBoardSessionAsync("personal_map_node_added", sessionId.ToString(), new { sessionId, node = dto });
        return dto;
    }

    public async Task<bool> UpdateNodePositionAsync(Guid sessionId, Guid memberId, Guid nodeId, UpdatePersonalMapNodePositionRequest req)
    {
        var node = await db.PersonalMapNodes
            .Include(n => n.Session)
            .FirstOrDefaultAsync(n => n.Id == nodeId && n.SessionId == sessionId && n.Session.CreatedByMemberId == memberId);
        if (node is null) return false;

        node.PositionX = req.PositionX;
        node.PositionY = req.PositionY;
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastToBoardSessionAsync("personal_map_node_moved", sessionId.ToString(),
            new { sessionId, nodeId, positionX = req.PositionX, positionY = req.PositionY });
        return true;
    }

    public async Task<bool> UpdateNodeSizeAsync(Guid sessionId, Guid memberId, Guid nodeId, UpdatePersonalMapNodeSizeRequest req)
    {
        var node = await db.PersonalMapNodes
            .Include(n => n.Session)
            .FirstOrDefaultAsync(n => n.Id == nodeId && n.SessionId == sessionId && n.Session.CreatedByMemberId == memberId);
        if (node is null) return false;

        node.Width = Math.Clamp(req.Width, 80, 640);
        node.Height = Math.Clamp(req.Height, 48, 480);
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastToBoardSessionAsync("personal_map_node_resized", sessionId.ToString(),
            new { sessionId, nodeId, width = node.Width, height = node.Height });
        return true;
    }

    public async Task<bool> UpdateNodeTextAsync(Guid sessionId, Guid memberId, Guid nodeId, UpdatePersonalMapNodeTextRequest req)
    {
        var node = await db.PersonalMapNodes
            .Include(n => n.Session)
            .FirstOrDefaultAsync(n => n.Id == nodeId && n.SessionId == sessionId && n.Session.CreatedByMemberId == memberId);
        if (node is null) return false;

        node.Label = string.IsNullOrWhiteSpace(req.Label) ? node.Label : req.Label.Trim();
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastToBoardSessionAsync("personal_map_node_text_updated", sessionId.ToString(),
            new { sessionId, nodeId, label = node.Label });
        return true;
    }

    public async Task<bool> DeleteNodeAsync(Guid sessionId, Guid memberId, Guid nodeId)
    {
        var node = await db.PersonalMapNodes
            .Include(n => n.Session)
            .FirstOrDefaultAsync(n => n.Id == nodeId && n.SessionId == sessionId && n.Session.CreatedByMemberId == memberId);
        if (node is null) return false;

        db.PersonalMapNodes.Remove(node);
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastToBoardSessionAsync("personal_map_node_deleted", sessionId.ToString(), new { sessionId, nodeId });
        return true;
    }

    private static PersonalMapSessionDto ToDto(PersonalMapSession session) => new()
    {
        Id = session.Id,
        Title = session.Title,
        CreatedByMemberId = session.CreatedByMemberId,
        CreatedAt = session.CreatedAt,
        Nodes = session.Nodes.Select(ToDto).ToList(),
    };

    private static PersonalMapNodeDto ToDto(PersonalMapNode node) => new()
    {
        Id = node.Id,
        SessionId = node.SessionId,
        Label = node.Label,
        PositionX = node.PositionX,
        PositionY = node.PositionY,
        Width = node.Width,
        Height = node.Height,
        Color = node.Color,
    };
}
