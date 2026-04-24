using AutoMapper;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Sprint;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class SprintService(AppDbContext db, IMapper mapper) : ISprintService
{
    public async Task<IReadOnlyList<SprintDto>> GetAllAsync(Guid? piId, DateOnly? from, DateOnly? to)
    {
        var query = db.Sprints.Include(s => s.PI).AsQueryable();

        if (piId.HasValue) query = query.Where(s => s.PIId == piId);
        if (from.HasValue) query = query.Where(s => s.StartDate >= from);
        if (to.HasValue) query = query.Where(s => s.EndDate <= to);

        var sprints = await query.OrderByDescending(s => s.StartDate).ToListAsync();
        return mapper.Map<List<SprintDto>>(sprints);
    }

    public async Task<SprintDto?> GetByIdAsync(Guid id)
    {
        var sprint = await db.Sprints.Include(s => s.PI).FirstOrDefaultAsync(s => s.Id == id);
        return sprint is null ? null : mapper.Map<SprintDto>(sprint);
    }

    public async Task<SprintDto> CreateAsync(CreateSprintRequest request)
    {
        var sprint = new Sprint
        {
            Name = request.Name,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            PIId = request.PIId,
            SprintNumber = request.SprintNumber,
            IsInnovationSprint = request.IsInnovationSprint
        };
        db.Sprints.Add(sprint);
        await db.SaveChangesAsync();
        return await GetByIdAsync(sprint.Id) ?? mapper.Map<SprintDto>(sprint);
    }

    public async Task<SprintDto?> UpdateAsync(Guid id, CreateSprintRequest request)
    {
        var sprint = await db.Sprints.FindAsync(id);
        if (sprint is null) return null;

        sprint.Name = request.Name;
        sprint.StartDate = request.StartDate;
        sprint.EndDate = request.EndDate;
        sprint.PIId = request.PIId;
        sprint.SprintNumber = request.SprintNumber;
        sprint.IsInnovationSprint = request.IsInnovationSprint;

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
}
