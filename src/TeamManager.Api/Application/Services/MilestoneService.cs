using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Milestone;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class MilestoneService(AppDbContext db) : IMilestoneService
{
    public async Task<IReadOnlyList<MilestoneDto>> GetByPIAsync(Guid piId, string? scope = null, Guid? squadId = null)
    {
        var query = db.Milestones
            .Include(m => m.WorkItems)
            .Include(m => m.Criteria)
            .Include(m => m.Squad)
            .Where(m => m.PIId == piId);

        if (!string.IsNullOrEmpty(scope) && scope != "All")
        {
            if (Enum.TryParse<MilestoneScope>(scope, true, out var parsedScope))
            {
                query = query.Where(m => m.Scope == parsedScope);
            }
        }

        if (squadId.HasValue)
        {
            query = query.Where(m => m.SquadId == squadId.Value);
        }

        var milestones = await query
            .OrderBy(m => m.Position)
            .ThenBy(m => m.TargetDate)
            .ToListAsync();

        return milestones.Select(ToDto).ToList();
    }

    public async Task<MilestoneRoadmapDto> GetRoadmapAsync(Guid piId)
    {
        var pi = await db.PIs.FindAsync(piId);
        var milestones = await db.Milestones
            .Include(m => m.WorkItems)
            .Include(m => m.Criteria)
            .Include(m => m.Squad)
            .Where(m => m.PIId == piId)
            .OrderBy(m => m.TargetDate)
            .ThenBy(m => m.Position)
            .ToListAsync();

        var items = milestones.Select(m =>
        {
            var taskCount = m.WorkItems.Count;
            var completedTaskCount = m.WorkItems.Count(w => w.Status == WorkItemStatus.Completed);
            var progressPercent = taskCount == 0 ? 0m : Math.Round((decimal)completedTaskCount / taskCount * 100, 1);
            var daysUntilTarget = m.TargetDate.HasValue
                ? (m.TargetDate.Value.ToDateTime(TimeOnly.MinValue) - DateTime.Today).Days
                : 0;

            return new MilestoneRoadmapItemDto
            {
                Id = m.Id,
                Title = m.Title,
                Scope = m.Scope.ToString(),
                SquadName = m.Squad?.Name,
                SquadColor = m.Squad?.Color,
                Status = m.Status.ToString(),
                TargetDate = m.TargetDate,
                ProgressPercent = progressPercent,
                DaysUntilTarget = daysUntilTarget,
                CriteriaTotal = m.Criteria.Count,
                CriteriaCompleted = m.Criteria.Count(c => c.Completed)
            };
        }).ToList();

        var completedCount = milestones.Count(m => m.Status == MilestoneStatus.Done);
        var inProgressCount = milestones.Count(m => m.Status == MilestoneStatus.InProgress);
        var upcomingCount = milestones.Count(m => m.Status == MilestoneStatus.Upcoming);
        var overallProgress = milestones.Count == 0 ? 0m : Math.Round((decimal)completedCount / milestones.Count * 100, 1);

        return new MilestoneRoadmapDto
        {
            PIId = piId,
            PIName = pi?.Name ?? string.Empty,
            TotalMilestones = milestones.Count,
            CompletedMilestones = completedCount,
            InProgressMilestones = inProgressCount,
            UpcomingMilestones = upcomingCount,
            OverallProgressPercent = overallProgress,
            Milestones = items
        };
    }

    public async Task<MilestoneDetailDto?> GetByIdAsync(Guid id)
    {
        var milestone = await db.Milestones
            .Include(m => m.Criteria.OrderBy(c => c.Position))
            .Include(m => m.WorkItems)
                .ThenInclude(w => w.SprintMember)
                .ThenInclude(sm => sm.TeamMember)
            .Include(m => m.WorkItems)
                .ThenInclude(w => w.SprintMember)
                .ThenInclude(sm => sm.Sprint)
            .Include(m => m.Squad)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (milestone is null) return null;

        var tasks = milestone.WorkItems.Select(w => new MilestoneWorkItemDto
        {
            Id = w.Id,
            Title = w.Title,
            Status = w.Status.ToString(),
            Type = w.Type.ToString(),
            Assignee = $"{w.SprintMember.TeamMember.FirstName} {w.SprintMember.TeamMember.LastName}",
            SprintMemberId = w.SprintMemberId,
            SprintName = w.SprintMember.Sprint.Name,
            SprintId = w.SprintMember.SprintId
        }).OrderBy(t => t.Status).ThenBy(t => t.Assignee).ToList();

        var sprintIds = tasks.Select(t => t.SprintId).Distinct();
        var sprints = await db.Sprints
            .Where(s => sprintIds.Contains(s.Id))
            .Select(s => new MilestoneSprintDto { Id = s.Id, Name = s.Name })
            .ToListAsync();

        var taskCount = tasks.Count;
        var completedTaskCount = tasks.Count(t => t.Status == WorkItemStatus.Completed.ToString());
        var progressPercent = taskCount == 0 ? 0m : Math.Round((decimal)completedTaskCount / taskCount * 100, 1);
        var criteriaCount = milestone.Criteria.Count;
        var completedCriteriaCount = milestone.Criteria.Count(c => c.Completed);

        return new MilestoneDetailDto
        {
            Id = milestone.Id,
            PIId = milestone.PIId,
            Title = milestone.Title,
            Description = milestone.Description,
            TargetDate = milestone.TargetDate,
            Status = milestone.Status.ToString(),
            Scope = milestone.Scope.ToString(),
            SquadId = milestone.SquadId,
            SquadName = milestone.Squad?.Name,
            SquadColor = milestone.Squad?.Color,
            Position = milestone.Position,
            CreatedAt = milestone.CreatedAt,
            UpdatedAt = milestone.UpdatedAt,
            TaskCount = taskCount,
            CompletedTaskCount = completedTaskCount,
            ProgressPercent = progressPercent,
            CriteriaCount = criteriaCount,
            CompletedCriteriaCount = completedCriteriaCount,
            Criteria = milestone.Criteria.Select(ToCriterionDto).ToList(),
            Tasks = tasks,
            Sprints = sprints
        };
    }

    public async Task<MilestoneDto> CreateAsync(Guid piId, CreateMilestoneRequest request)
    {
        if (request.Scope == MilestoneScope.Squad && !request.SquadId.HasValue)
        {
            throw new ArgumentException("SquadId is required when scope is Squad");
        }

        var milestone = new Milestone
        {
            PIId = piId,
            Title = request.Title,
            Description = request.Description,
            TargetDate = request.TargetDate,
            Status = request.Status,
            Scope = request.Scope,
            SquadId = request.SquadId,
            Position = request.Position,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        db.Milestones.Add(milestone);
        await db.SaveChangesAsync();
        return ToDto(milestone);
    }

    public async Task<MilestoneDto?> UpdateAsync(Guid id, UpdateMilestoneRequest request)
    {
        var milestone = await db.Milestones.FindAsync(id);
        if (milestone is null) return null;

        if (request.Title is not null) milestone.Title = request.Title;
        if (request.Description is not null) milestone.Description = request.Description;
        if (request.TargetDate is not null) milestone.TargetDate = request.TargetDate;
        if (request.Status.HasValue) milestone.Status = request.Status.Value;
        if (request.Position.HasValue) milestone.Position = request.Position.Value;
        if (request.Scope.HasValue) milestone.Scope = request.Scope.Value;
        if (request.SquadId.HasValue || (request.Scope.HasValue && request.Scope.Value == MilestoneScope.Global))
        {
            milestone.SquadId = request.SquadId;
        }
        milestone.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync();
        return ToDto(milestone);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var milestone = await db.Milestones.FindAsync(id);
        if (milestone is null) return false;
        db.Milestones.Remove(milestone);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<IReadOnlyList<MilestoneCriterionDto>> GetCriteriaAsync(Guid milestoneId)
    {
        var criteria = await db.MilestoneCriteria
            .Where(mc => mc.MilestoneId == milestoneId)
            .OrderBy(mc => mc.Position)
            .ToListAsync();
        return criteria.Select(ToCriterionDto).ToList();
    }

    public async Task<MilestoneCriterionDto> AddCriterionAsync(Guid milestoneId, CreateMilestoneCriterionRequest request)
    {
        var criterion = new MilestoneCriterion
        {
            MilestoneId = milestoneId,
            Label = request.Label,
            Completed = request.Completed,
            Position = request.Position
        };
        db.MilestoneCriteria.Add(criterion);
        await db.SaveChangesAsync();

        await UpdateMilestoneTimestamp(milestoneId);

        return ToCriterionDto(criterion);
    }

    public async Task<MilestoneCriterionDto?> UpdateCriterionAsync(Guid criterionId, UpdateMilestoneCriterionRequest request)
    {
        var criterion = await db.MilestoneCriteria.FindAsync(criterionId);
        if (criterion is null) return null;

        if (request.Label is not null) criterion.Label = request.Label;
        if (request.Completed.HasValue) criterion.Completed = request.Completed.Value;
        if (request.Position.HasValue) criterion.Position = request.Position.Value;

        await db.SaveChangesAsync();
        await UpdateMilestoneTimestamp(criterion.MilestoneId);

        return ToCriterionDto(criterion);
    }

    public async Task<bool> DeleteCriterionAsync(Guid criterionId)
    {
        var criterion = await db.MilestoneCriteria.FindAsync(criterionId);
        if (criterion is null) return false;
        db.MilestoneCriteria.Remove(criterion);
        await db.SaveChangesAsync();

        await UpdateMilestoneTimestamp(criterion.MilestoneId);

        return true;
    }

    private async Task UpdateMilestoneTimestamp(Guid milestoneId)
    {
        var milestone = await db.Milestones.FindAsync(milestoneId);
        if (milestone is not null)
        {
            milestone.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
        }
    }

    private MilestoneDto ToDto(Milestone m)
    {
        var taskCount = m.WorkItems.Count;
        var completedTaskCount = m.WorkItems.Count(w => w.Status == WorkItemStatus.Completed);
        var progressPercent = taskCount == 0 ? 0m : Math.Round((decimal)completedTaskCount / taskCount * 100, 1);
        var criteriaCount = m.Criteria.Count;
        var completedCriteriaCount = m.Criteria.Count(c => c.Completed);

        return new MilestoneDto
        {
            Id = m.Id,
            PIId = m.PIId,
            Title = m.Title,
            Description = m.Description,
            TargetDate = m.TargetDate,
            Status = m.Status.ToString(),
            Scope = m.Scope.ToString(),
            SquadId = m.SquadId,
            SquadName = m.Squad?.Name,
            SquadColor = m.Squad?.Color,
            Position = m.Position,
            CreatedAt = m.CreatedAt,
            UpdatedAt = m.UpdatedAt,
            TaskCount = taskCount,
            CompletedTaskCount = completedTaskCount,
            ProgressPercent = progressPercent,
            CriteriaCount = criteriaCount,
            CompletedCriteriaCount = completedCriteriaCount
        };
    }

    private static MilestoneCriterionDto ToCriterionDto(MilestoneCriterion c) => new()
    {
        Id = c.Id,
        MilestoneId = c.MilestoneId,
        Label = c.Label,
        Completed = c.Completed,
        Position = c.Position
    };
}
