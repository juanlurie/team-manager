using AutoMapper;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.WorkItem;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class WorkItemService(AppDbContext db, IMapper mapper) : IWorkItemService
{
    public async Task<IReadOnlyList<WorkItemDto>> GetBySprintMemberAsync(Guid sprintMemberId)
    {
        var items = await db.WorkItems
            .Include(w => w.Feature)
            .Where(w => w.SprintMemberId == sprintMemberId)
            .OrderBy(w => w.Status)
            .ThenBy(w => w.Title)
            .ToListAsync();
        return items.Select(ToDto).ToList();
    }

    public async Task<WorkItemDto?> GetByIdAsync(Guid id)
    {
        var item = await db.WorkItems.Include(w => w.Feature).FirstOrDefaultAsync(w => w.Id == id);
        return item is null ? null : ToDto(item);
    }

    public async Task<WorkItemDto> CreateAsync(Guid sprintMemberId, CreateWorkItemRequest request)
    {
        var item = new WorkItem
        {
            Title = request.Title,
            Description = request.Description,
            Type = request.Type,
            SprintMemberId = sprintMemberId,
            FeatureId = request.FeatureId,
            ExternalTicketRef = request.ExternalTicketRef,
            EstimatedPoints = request.EstimatedPoints,
            ActualPoints = request.ActualPoints,
            CompletedDate = request.CompletedDate
        };
        ApplyStatus(item, request.Status);
        db.WorkItems.Add(item);
        await db.SaveChangesAsync();
        await db.Entry(item).Reference(w => w.Feature).LoadAsync();
        return ToDto(item);
    }

    public async Task<WorkItemDto?> UpdateAsync(Guid id, CreateWorkItemRequest request)
    {
        var item = await db.WorkItems.Include(w => w.Feature).FirstOrDefaultAsync(w => w.Id == id);
        if (item is null) return null;

        item.Title = request.Title;
        item.Description = request.Description;
        item.Type = request.Type;
        item.FeatureId = request.FeatureId;
        item.ExternalTicketRef = request.ExternalTicketRef;
        item.EstimatedPoints = request.EstimatedPoints;
        item.ActualPoints = request.ActualPoints;
        item.CompletedDate = request.CompletedDate;
        ApplyStatus(item, request.Status);

        await db.SaveChangesAsync();
        await db.Entry(item).Reference(w => w.Feature).LoadAsync();
        return ToDto(item);
    }

    public async Task<WorkItemDto?> UpdateStatusAsync(Guid id, WorkItemStatus status)
    {
        var item = await db.WorkItems.Include(w => w.Feature).FirstOrDefaultAsync(w => w.Id == id);
        if (item is null) return null;
        ApplyStatus(item, status);
        await db.SaveChangesAsync();
        return ToDto(item);
    }

    private static void ApplyStatus(WorkItem item, WorkItemStatus status)
    {
        item.Status = status;
        if (status == WorkItemStatus.Blocked)
            item.BlockedAt ??= DateTimeOffset.UtcNow;
        else
            item.BlockedAt = null;
        if (status == WorkItemStatus.Completed)
            item.CompletedDate ??= DateOnly.FromDateTime(DateTime.UtcNow);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var item = await db.WorkItems.FindAsync(id);
        if (item is null) return false;
        db.WorkItems.Remove(item);
        await db.SaveChangesAsync();
        return true;
    }

    private static WorkItemDto ToDto(WorkItem w) => new()
    {
        Id = w.Id,
        Title = w.Title,
        Description = w.Description,
        Type = w.Type.ToString(),
        Status = w.Status.ToString(),
        SprintMemberId = w.SprintMemberId,
        FeatureId = w.FeatureId,
        FeatureTitle = w.Feature?.Title,
        ExternalTicketRef = w.ExternalTicketRef,
        EstimatedPoints = w.EstimatedPoints,
        ActualPoints = w.ActualPoints,
        CompletedDate = w.CompletedDate,
        BlockedAt = w.BlockedAt
    };
}
