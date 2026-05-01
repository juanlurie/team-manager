using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.DiscussionPoint;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class DiscussionPointService(AppDbContext db) : IDiscussionPointService
{
    public async Task<IReadOnlyList<DiscussionPointDto>> GetAllAsync()
    {
        var items = await db.DiscussionPoints.OrderBy(d => d.CreatedAt).ToListAsync();
        return items.Select(ToDto).ToList();
    }

    public async Task<DiscussionPointDto> CreateAsync(CreateDiscussionPointRequest request)
    {
        var dp = new DiscussionPoint
        {
            Title      = request.Title,
            Notes      = request.Notes,
            Status     = request.Status,
            Priority   = request.Priority,
            StartDate  = request.StartDate,
            TargetDate = request.TargetDate,
        };
        db.DiscussionPoints.Add(dp);
        await db.SaveChangesAsync();
        return ToDto(dp);
    }

    public async Task<DiscussionPointDto?> UpdateAsync(Guid id, CreateDiscussionPointRequest request)
    {
        var dp = await db.DiscussionPoints.FindAsync(id);
        if (dp is null) return null;
        dp.Title      = request.Title;
        dp.Notes      = request.Notes;
        dp.Status     = request.Status;
        dp.Priority   = request.Priority;
        dp.StartDate  = request.StartDate;
        dp.TargetDate = request.TargetDate;
        dp.UpdatedAt  = DateTimeOffset.UtcNow;
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
        Id         = d.Id,
        Title      = d.Title,
        Notes      = d.Notes,
        Status     = d.Status,
        Priority   = d.Priority,
        StartDate  = d.StartDate,
        TargetDate = d.TargetDate,
        CreatedAt  = d.CreatedAt,
        UpdatedAt  = d.UpdatedAt,
    };
}
