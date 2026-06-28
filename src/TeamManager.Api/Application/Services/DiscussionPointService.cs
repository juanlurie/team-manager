using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.DiscussionPoint;
using TeamManager.Api.Application.DTOs.DiscussionTask;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class DiscussionPointService(AppDbContext db) : IDiscussionPointService
{
    public async Task<IReadOnlyList<DiscussionPointDto>> GetAllAsync()
    {
        var items = await db.DiscussionPoints
            .Include(d => d.Assignee)
            .OrderBy(d => d.CreatedAt)
            .ToListAsync();
        return items.Select(ToDto).ToList();
    }

    public async Task<DiscussionPointDto> CreateAsync(CreateDiscussionPointRequest request)
    {
        var dp = new DiscussionPoint
        {
            Title        = request.Title,
            Notes        = request.Notes,
            Status       = request.Status,
            Priority     = request.Priority,
            StartDate    = request.StartDate,
            TargetDate   = request.TargetDate,
            TeamMemberId = request.TeamMemberId,
        };
        db.DiscussionPoints.Add(dp);
        await db.SaveChangesAsync();
        // Reload with Assignee for proper DTO
        var saved = await db.DiscussionPoints
            .Include(d => d.Assignee)
            .FirstAsync(d => d.Id == dp.Id);
        return ToDto(saved);
    }

    public async Task<DiscussionPointDto?> UpdateAsync(Guid id, CreateDiscussionPointRequest request)
    {
        var dp = await db.DiscussionPoints
            .Include(d => d.Assignee)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (dp is null) return null;
        dp.Title        = request.Title;
        dp.Notes        = request.Notes;
        dp.Status       = request.Status;
        dp.Priority     = request.Priority;
        dp.StartDate    = request.StartDate;
        dp.TargetDate   = request.TargetDate;
        dp.TeamMemberId = request.TeamMemberId;
        dp.UpdatedAt    = DateTimeOffset.UtcNow;
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
        Id           = d.Id,
        Title        = d.Title,
        Notes        = d.Notes,
        Status       = d.Status,
        Priority     = d.Priority,
        StartDate    = d.StartDate,
        TargetDate   = d.TargetDate,
        TeamMemberId = d.TeamMemberId,
        AssigneeName = d.Assignee is not null ? d.Assignee.FirstName + " " + d.Assignee.LastName : null,
        CreatedAt    = d.CreatedAt,
        UpdatedAt    = d.UpdatedAt,
    };

    // Task methods
    public async Task<IReadOnlyList<DiscussionTaskDto>> GetTasksAsync(Guid discussionPointId)
    {
        var tasks = await db.DiscussionTasks
            .Include(t => t.Assignee)
            .Where(t => t.DiscussionPointId == discussionPointId)
            .OrderBy(t => t.CreatedAt)
            .ToListAsync();
        return tasks.Select(ToTaskDto).ToList();
    }

    public async Task<DiscussionTaskDto> CreateTaskAsync(Guid discussionPointId, CreateDiscussionTaskRequest request)
    {
        var task = new DiscussionTask
        {
            DiscussionPointId = discussionPointId,
            Title             = request.Title,
            Description       = request.Description,
            TeamMemberId      = request.TeamMemberId,
            DueDate           = request.DueDate,
        };
        db.DiscussionTasks.Add(task);
        await db.SaveChangesAsync();
        // Reload with Assignee for proper DTO
        var saved = await db.DiscussionTasks
            .Include(t => t.Assignee)
            .FirstAsync(t => t.Id == task.Id);
        return ToTaskDto(saved);
    }

    public async Task<DiscussionTaskDto?> UpdateTaskAsync(Guid discussionPointId, Guid taskId, CreateDiscussionTaskRequest request)
    {
        var task = await db.DiscussionTasks
            .Include(t => t.Assignee)
            .FirstOrDefaultAsync(t => t.Id == taskId && t.DiscussionPointId == discussionPointId);
        if (task is null) return null;
        task.Title       = request.Title;
        task.Description = request.Description;
        task.TeamMemberId = request.TeamMemberId;
        task.DueDate     = request.DueDate;
        await db.SaveChangesAsync();
        return ToTaskDto(task);
    }

    public async Task<bool> DeleteTaskAsync(Guid discussionPointId, Guid taskId)
    {
        var task = await db.DiscussionTasks
            .FirstOrDefaultAsync(t => t.Id == taskId && t.DiscussionPointId == discussionPointId);
        if (task is null) return false;
        db.DiscussionTasks.Remove(task);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<DiscussionTaskDto?> ToggleTaskAsync(Guid discussionPointId, Guid taskId)
    {
        var task = await db.DiscussionTasks
            .Include(t => t.Assignee)
            .FirstOrDefaultAsync(t => t.Id == taskId && t.DiscussionPointId == discussionPointId);
        if (task is null) return null;
        task.IsCompleted = !task.IsCompleted;
        task.CompletedAt = task.IsCompleted ? DateTimeOffset.UtcNow : null;
        await db.SaveChangesAsync();
        return ToTaskDto(task);
    }

    private static DiscussionTaskDto ToTaskDto(DiscussionTask t) => new()
    {
        Id               = t.Id,
        DiscussionPointId = t.DiscussionPointId,
        Title            = t.Title,
        Description      = t.Description,
        TeamMemberId     = t.TeamMemberId,
        AssigneeName = t.Assignee is not null ? t.Assignee.FirstName + " " + t.Assignee.LastName : null,
        IsCompleted      = t.IsCompleted,
        DueDate          = t.DueDate,
        CreatedAt        = t.CreatedAt,
        CompletedAt      = t.CompletedAt,
    };
}
