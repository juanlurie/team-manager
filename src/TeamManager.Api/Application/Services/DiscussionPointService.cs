using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.DiscussionPoint;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class DiscussionPointService(AppDbContext db) : IDiscussionPointService
{
    public async Task<IReadOnlyList<DiscussionPointDto>> GetAllAsync(Guid? sprintId = null)
    {
        var query = db.DiscussionPoints.AsQueryable();
        if (sprintId.HasValue)
            query = query.Where(d => d.SprintId == sprintId);
        var items = await query.OrderBy(d => d.CreatedAt).ToListAsync();
        return items.Select(ToDto).ToList();
    }

    public async Task<DiscussionPointDto> CreateAsync(CreateDiscussionPointRequest request)
    {
        var dp = new DiscussionPoint
        {
            Title    = request.Title,
            Notes    = request.Notes,
            Status   = request.Status,
            Priority = request.Priority,
            SprintId = request.SprintId,
        };
        db.DiscussionPoints.Add(dp);
        await db.SaveChangesAsync();
        return ToDto(dp);
    }

    public async Task<DiscussionPointDto?> UpdateAsync(Guid id, CreateDiscussionPointRequest request)
    {
        var dp = await db.DiscussionPoints.FindAsync(id);
        if (dp is null) return null;
        dp.Title     = request.Title;
        dp.Notes     = request.Notes;
        dp.Status    = request.Status;
        dp.Priority  = request.Priority;
        dp.SprintId  = request.SprintId;
        dp.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return ToDto(dp);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var dp = await db.DiscussionPoints.FindAsync(id);
        if (dp is null) return false;
        db.DiscussionPoints.Remove(dp);
        await db.SaveChangesAsync();
        return true;
    }

    private static DiscussionPointDto ToDto(DiscussionPoint d) => new()
    {
        Id        = d.Id,
        Title     = d.Title,
        Notes     = d.Notes,
        Status    = d.Status,
        Priority  = d.Priority,
        SprintId  = d.SprintId,
        CreatedAt = d.CreatedAt,
        UpdatedAt = d.UpdatedAt,
    };
}
