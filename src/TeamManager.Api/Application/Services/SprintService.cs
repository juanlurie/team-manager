using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Sprint;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class SprintService(AppDbContext db) : ISprintService
{
    public async Task<IReadOnlyList<SprintDto>> GetAllAsync(Guid? piId, DateOnly? from, DateOnly? to)
    {
        var query = db.Sprints.Include(s => s.PI).AsQueryable();

        if (piId.HasValue) query = query.Where(s => s.PIId == piId);
        if (from.HasValue) query = query.Where(s => s.StartDate >= from);
        if (to.HasValue) query = query.Where(s => s.EndDate <= to);

        var sprints = await query.OrderByDescending(s => s.StartDate).ToListAsync();
        return sprints.Select(ToDto).ToList();
    }

    public async Task<SprintDto?> GetByIdAsync(Guid id)
    {
        var sprint = await db.Sprints.Include(s => s.PI).FirstOrDefaultAsync(s => s.Id == id);
        return sprint is null ? null : ToDto(sprint);
    }

    public async Task<SprintDto> CreateAsync(CreateSprintRequest request)
    {
        var sprint = new Sprint
        {
            Name = request.Name,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            PIId = request.PiId,
            SprintNumber = request.SprintNumber,
            IsInnovationSprint = request.IsInnovationSprint,
            Goal = request.Goal
        };
        db.Sprints.Add(sprint);
        await db.SaveChangesAsync();
        return await GetByIdAsync(sprint.Id) ?? ToDto(sprint);
    }

    public async Task<SprintDto?> UpdateAsync(Guid id, CreateSprintRequest request)
    {
        var sprint = await db.Sprints.FindAsync(id);
        if (sprint is null) return null;

        sprint.Name = request.Name;
        sprint.StartDate = request.StartDate;
        sprint.EndDate = request.EndDate;
        sprint.PIId = request.PiId;
        sprint.SprintNumber = request.SprintNumber;
        sprint.IsInnovationSprint = request.IsInnovationSprint;
        sprint.Goal = request.Goal;

        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var sprint = await db.Sprints.FindAsync(id);
        if (sprint is null) return false;
        db.Sprints.Remove(sprint);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<SprintDto?> UpdateRetroAsync(Guid id, UpdateRetroRequest request)
    {
        var sprint = await db.Sprints.FindAsync(id);
        if (sprint is null) return null;
        sprint.RetroWentWell    = request.WentWell;
        sprint.RetroDidntGoWell = request.DidntGoWell;
        sprint.RetroActionItems = request.ActionItems;
        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<int> InitializeMembersAsync(Guid sprintId)
    {
        var activeMembers = await db.TeamMembers
            .Where(m => m.IsActive)
            .Select(m => m.Id)
            .ToListAsync();

        var existingMemberIds = await db.SprintMembers
            .Where(sm => sm.SprintId == sprintId)
            .Select(sm => sm.TeamMemberId)
            .ToListAsync();

        var toAdd = activeMembers
            .Except(existingMemberIds)
            .Select(memberId => new SprintMember { SprintId = sprintId, TeamMemberId = memberId })
            .ToList();

        db.SprintMembers.AddRange(toAdd);
        await db.SaveChangesAsync();
        return toAdd.Count;
    }

    public async Task<SprintDto?> CloneAsync(Guid sourceId, CloneSprintRequest request)
    {
        var source = await db.Sprints
            .Include(s => s.SprintMembers)
            .FirstOrDefaultAsync(s => s.Id == sourceId);
        if (source is null) return null;

        var clone = new Sprint
        {
            Name        = request.Name,
            StartDate   = request.StartDate,
            EndDate     = request.EndDate,
            PIId        = source.PIId,
            SprintNumber       = source.SprintNumber,
            IsInnovationSprint = source.IsInnovationSprint
        };

        if (request.CopyMembers)
        {
            foreach (var sm in source.SprintMembers)
                clone.SprintMembers.Add(new SprintMember
                {
                    TeamMemberId = sm.TeamMemberId,
                    Capacity     = sm.Capacity
                });
        }

        db.Sprints.Add(clone);
        await db.SaveChangesAsync();
        return await GetByIdAsync(clone.Id) ?? ToDto(clone);
    }

    public async Task<SprintDto?> CloseAsync(Guid id)
    {
        var sprint = await db.Sprints.FindAsync(id);
        if (sprint is null) return null;
        sprint.IsActive = false;
        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<IReadOnlyList<VelocityEntryDto>> GetVelocityAsync(Guid? piId)
    {
        var query = db.Sprints.AsQueryable();
        if (piId.HasValue) query = query.Where(s => s.PIId == piId);

        return await query
            .OrderBy(s => s.StartDate)
            .Select(s => new VelocityEntryDto(
                s.Id,
                s.Name,
                s.PIId,
                s.SprintMembers.SelectMany(sm => sm.WorkItems).Count(w =>
                    w.Status == WorkItemStatus.Completed ||
                    w.Status == WorkItemStatus.ReadyForRelease ||
                    w.Status == WorkItemStatus.Released),
                s.SprintMembers.SelectMany(sm => sm.WorkItems).Count()
            ))
            .ToListAsync();
    }

    internal static SprintDto ToDto(Sprint s) => new()
    {
        Id = s.Id,
        Name = s.Name,
        StartDate = s.StartDate,
        EndDate = s.EndDate,
        PiId = s.PIId,
        PiName = s.PI?.Name,
        SprintNumber = s.SprintNumber,
        IsInnovationSprint = s.IsInnovationSprint,
        IsActive = s.IsActive,
        Goal = s.Goal,
        RetroWentWell = s.RetroWentWell,
        RetroDidntGoWell = s.RetroDidntGoWell,
        RetroActionItems = s.RetroActionItems
    };
}
