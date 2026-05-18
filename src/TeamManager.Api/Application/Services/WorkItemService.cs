using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.WorkItem;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class WorkItemService(AppDbContext db, WorkItemEventRecorder events) : IWorkItemService
{
    public async Task<IReadOnlyList<WorkItemDto>> GetBySprintMemberAsync(Guid sprintMemberId)
    {
        var items = await db.WorkItems
            .Include(w => w.Feature)
            .Include(w => w.Milestone)
            .Where(w => w.SprintMemberId == sprintMemberId)
            .OrderBy(w => w.Status)
            .ThenBy(w => w.Title)
            .ToListAsync();
        return items.Select(ToDto).ToList();
    }

    public async Task<WorkItemDto?> GetByIdAsync(Guid id)
    {
        var item = await db.WorkItems.Include(w => w.Feature).Include(w => w.Milestone).FirstOrDefaultAsync(w => w.Id == id);
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
            MilestoneId = request.MilestoneId,
            ExternalTicketRef = request.ExternalTicketRef,
            EstimatedPoints = request.EstimatedPoints,
            ActualPoints = request.ActualPoints,
            CompletedDate = request.CompletedDate
        };
        ApplyStatus(item, request.Status, request.BlockedReason);
        db.WorkItems.Add(item);
        await db.SaveChangesAsync();

        events.Append(item.Id, WorkItemEventType.TASK_CREATED, toValue: item.Status.ToString(), metadata: new { item.Type, item.Title });

        await db.Entry(item).Reference(w => w.Feature).LoadAsync();
        await db.Entry(item).Reference(w => w.Milestone).LoadAsync();
        return ToDto(item);
    }

    public async Task<WorkItemDto?> UpdateAsync(Guid id, CreateWorkItemRequest request)
    {
        var item = await db.WorkItems.Include(w => w.Feature).Include(w => w.Milestone).FirstOrDefaultAsync(w => w.Id == id);
        if (item is null) return null;

        var oldStatus = item.Status;
        var oldBlockedReason = item.BlockedReason;
        var oldFeatureId = item.FeatureId;
        var oldMilestoneId = item.MilestoneId;
        var oldTitle = item.Title;
        var oldDescription = item.Description;
        var oldEstimatedPoints = item.EstimatedPoints;
        var oldActualPoints = item.ActualPoints;

        item.Title = request.Title;
        item.Description = request.Description;
        item.Type = request.Type;
        item.FeatureId = request.FeatureId;
        item.MilestoneId = request.MilestoneId;
        item.ExternalTicketRef = request.ExternalTicketRef;
        item.EstimatedPoints = request.EstimatedPoints;
        item.ActualPoints = request.ActualPoints;
        item.CompletedDate = request.CompletedDate;
        ApplyStatus(item, request.Status, request.BlockedReason);

        if (oldTitle != item.Title)
            events.Append(id, WorkItemEventType.TITLE_CHANGED, fromValue: oldTitle, toValue: item.Title);
        if (oldDescription != item.Description)
            events.Append(id, WorkItemEventType.DESCRIPTION_CHANGED);
        if (oldStatus != item.Status)
            events.Append(id, WorkItemEventType.STATUS_CHANGED, fromValue: oldStatus.ToString(), toValue: item.Status.ToString());
        if (oldBlockedReason == null && item.BlockedReason != null)
            events.Append(id, WorkItemEventType.BLOCKER_ADDED, toValue: item.BlockedReason);
        else if (oldBlockedReason != null && item.BlockedReason == null)
            events.Append(id, WorkItemEventType.BLOCKER_REMOVED, fromValue: oldBlockedReason);
        if (oldFeatureId != item.FeatureId)
            events.Append(id, WorkItemEventType.FEATURE_CHANGED, fromValue: oldFeatureId?.ToString(), toValue: item.FeatureId?.ToString());
        if (oldEstimatedPoints != item.EstimatedPoints)
            events.Append(id, WorkItemEventType.ESTIMATE_CHANGED, fromValue: oldEstimatedPoints?.ToString(), toValue: item.EstimatedPoints?.ToString());
        if (oldActualPoints != item.ActualPoints)
            events.Append(id, WorkItemEventType.ACTUALS_CHANGED, fromValue: oldActualPoints?.ToString(), toValue: item.ActualPoints?.ToString());

        await db.SaveChangesAsync();
        await db.Entry(item).Reference(w => w.Feature).LoadAsync();
        await db.Entry(item).Reference(w => w.Milestone).LoadAsync();
        return ToDto(item);
    }

    public async Task<WorkItemDto?> UpdateStatusAsync(Guid id, WorkItemStatus status)
    {
        var item = await db.WorkItems.Include(w => w.Feature).Include(w => w.Milestone).FirstOrDefaultAsync(w => w.Id == id);
        if (item is null) return null;

        var oldStatus = item.Status;
        var oldBlockedReason = item.BlockedReason;

        ApplyStatus(item, status);

        if (oldStatus != item.Status)
        {
            events.Append(id, WorkItemEventType.STATUS_CHANGED, fromValue: oldStatus.ToString(), toValue: item.Status.ToString());

            if (oldStatus != WorkItemStatus.Blocked && item.Status == WorkItemStatus.Blocked)
                events.Append(id, WorkItemEventType.BLOCKER_ADDED, toValue: item.BlockedReason);
            else if (oldStatus == WorkItemStatus.Blocked && item.Status != WorkItemStatus.Blocked)
                events.Append(id, WorkItemEventType.BLOCKER_REMOVED, fromValue: oldBlockedReason);

            if (item.Status == WorkItemStatus.Completed && oldStatus != WorkItemStatus.Completed)
                events.Append(id, WorkItemEventType.COMPLETED);
        }

        await db.SaveChangesAsync();
        return ToDto(item);
    }

    private static void ApplyStatus(WorkItem item, WorkItemStatus status, string? blockedReason = null)
    {
        item.Status = status;
        if (status == WorkItemStatus.Blocked)
        {
            item.BlockedAt ??= DateTimeOffset.UtcNow;
            item.BlockedReason = blockedReason;
        }
        else
        {
            item.BlockedAt = null;
            item.BlockedReason = null;
        }
        if (status == WorkItemStatus.Completed)
            item.CompletedDate ??= DateOnly.FromDateTime(DateTime.UtcNow);
    }

    public async Task<WorkItemDto?> CarryOverAsync(Guid workItemId, Guid targetSprintId)
    {
        var source = await db.WorkItems
            .Include(w => w.SprintMember)
            .FirstOrDefaultAsync(w => w.Id == workItemId);
        if (source is null) return null;

        var targetMember = await db.SprintMembers
            .FirstOrDefaultAsync(sm => sm.SprintId == targetSprintId && sm.TeamMemberId == source.SprintMember.TeamMemberId);

        if (targetMember is null)
        {
            targetMember = new SprintMember { SprintId = targetSprintId, TeamMemberId = source.SprintMember.TeamMemberId };
            db.SprintMembers.Add(targetMember);
        }

        var copy = new WorkItem
        {
            Title = source.Title,
            Description = source.Description,
            Type = source.Type,
            SprintMemberId = targetMember.Id,
            FeatureId = null,
            ExternalTicketRef = source.ExternalTicketRef,
            MilestoneId = source.MilestoneId,
            EstimatedPoints = source.EstimatedPoints,
            ActualPoints = null,
            CompletedDate = null,
            Status = WorkItemStatus.Planned
        };
        db.WorkItems.Add(copy);
        await db.SaveChangesAsync();

        events.Append(copy.Id, WorkItemEventType.CARRIED_OVER, fromValue: source.Id.ToString(), metadata: new { SourceSprintId = source.SprintMember.SprintId, TargetSprintId = targetSprintId });

        return ToDto(copy);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var item = await db.WorkItems.FindAsync(id);
        if (item is null) return false;
        db.WorkItems.Remove(item);
        await db.SaveChangesAsync();
        return true;
    }

    internal static WorkItemDto ToDto(WorkItem w) => new()
    {
        Id = w.Id,
        Title = w.Title,
        Description = w.Description,
        Type = w.Type.ToString(),
        Status = w.Status.ToString(),
        SprintMemberId = w.SprintMemberId,
        FeatureId = w.FeatureId,
        FeatureTitle = w.Feature?.Title,
        MilestoneId = w.MilestoneId,
        MilestoneTitle = w.Milestone?.Title,
        ExternalTicketRef = w.ExternalTicketRef,
        EstimatedPoints = w.EstimatedPoints,
        ActualPoints = w.ActualPoints,
        CompletedDate = w.CompletedDate,
        BlockedAt = w.BlockedAt,
        BlockedReason = w.BlockedReason,
        CommentCount = 0
    };
}
