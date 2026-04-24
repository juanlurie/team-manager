using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Progress;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class ProgressService(AppDbContext db)
{
    public async Task<IReadOnlyList<ProgressPIDto>> GetAllAsync()
    {
        var pis = await db.PIs
            .Include(p => p.Sprints)
                .ThenInclude(s => s.Features)
                    .ThenInclude(f => f.WorkItems)
            .OrderBy(p => p.StartDate)
            .ToListAsync();

        return pis.Select(p => new ProgressPIDto
        {
            Id = p.Id,
            Name = p.Name,
            StartDate = p.StartDate,
            EndDate = p.EndDate,
            Sprints = p.Sprints
                .OrderBy(s => s.StartDate)
                .Select(s => new ProgressSprintDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    StartDate = s.StartDate,
                    EndDate = s.EndDate,
                    SprintNumber = s.SprintNumber,
                    IsInnovationSprint = s.IsInnovationSprint,
                    Features = s.Features
                        .OrderBy(f => f.IsUnplanned)
                        .ThenBy(f => f.Title)
                        .Select(f => new ProgressFeatureDto
                        {
                            Id = f.Id,
                            Title = f.Title,
                            ExternalTicketRef = f.ExternalTicketRef,
                            Status = f.Status.ToString(),
                            EstimatedDays = f.EstimatedDays,
                            IsUnplanned = f.IsUnplanned,
                            StartDate = f.StartDate,
                            TotalTasks = f.WorkItems.Count,
                            CompletedTasks = f.WorkItems.Count(w =>
                                w.Status == WorkItemStatus.Completed ||
                                w.Status == WorkItemStatus.ReadyForRelease ||
                                w.Status == WorkItemStatus.Released),
                            InProgressTasks = f.WorkItems.Count(w => w.Status == WorkItemStatus.InProgress),
                            BlockedTasks = f.WorkItems.Count(w => w.Status == WorkItemStatus.Blocked)
                        })
                        .ToList()
                })
                .ToList()
        }).ToList();
    }
}
