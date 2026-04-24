using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Feature;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class FeatureService(AppDbContext db) : IFeatureService
{
    public async Task<IReadOnlyList<FeatureDto>> GetAllAsync(string? status = null)
    {
        var query = db.Features
            .Include(f => f.Sprint).ThenInclude(s => s.PI)
            .Include(f => f.WorkItems).ThenInclude(w => w.SprintMember).ThenInclude(sm => sm.TeamMember)
            .AsQueryable();
        if (status is not null && Enum.TryParse<WorkItemStatus>(status, true, out var parsedStatus))
            query = query.Where(f => f.Status == parsedStatus);
        var features = await query.OrderByDescending(f => f.Sprint.StartDate).ThenBy(f => f.Title).ToListAsync();
        return features.Select(f => ToDto(f, f.Sprint?.Name, f.Sprint?.PI?.Name)).ToList();
    }

    public async Task<IReadOnlyList<FeatureDto>> GetBySprintAsync(Guid sprintId)
    {
        var features = await db.Features
            .Where(f => f.SprintId == sprintId)
            .OrderBy(f => f.Title)
            .ToListAsync();
        return features.Select(f => ToDto(f)).ToList();
    }

    public async Task<FeatureDto> CreateAsync(Guid sprintId, CreateFeatureRequest request)
    {
        var feature = new Feature
        {
            SprintId = sprintId,
            Title = request.Title,
            Description = request.Description,
            ExternalTicketRef = request.ExternalTicketRef,
            Status = request.Status,
            EstimatedDays = request.EstimatedDays,
            IsUnplanned = request.IsUnplanned,
            StartDate = request.StartDate
        };
        db.Features.Add(feature);
        await db.SaveChangesAsync();
        return ToDto(feature);
    }

    public async Task<FeatureDto?> UpdateAsync(Guid id, CreateFeatureRequest request)
    {
        var feature = await db.Features.FindAsync(id);
        if (feature is null) return null;

        feature.Title = request.Title;
        feature.Description = request.Description;
        feature.ExternalTicketRef = request.ExternalTicketRef;
        feature.Status = request.Status;
        feature.EstimatedDays = request.EstimatedDays;
        feature.IsUnplanned = request.IsUnplanned;
        feature.StartDate = request.StartDate;

        await db.SaveChangesAsync();
        return ToDto(feature);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var feature = await db.Features.FindAsync(id);
        if (feature is null) return false;
        db.Features.Remove(feature);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<FeatureDto?> SetStatusAsync(Guid id, string status)
    {
        var feature = await db.Features.FindAsync(id);
        if (feature is null) return null;
        if (Enum.TryParse<WorkItemStatus>(status, true, out var parsed))
            feature.Status = parsed;
        await db.SaveChangesAsync();
        return ToDto(feature);
    }

    public async Task<FeatureDto?> ToggleActiveAsync(Guid id)
    {
        var feature = await db.Features.FindAsync(id);
        if (feature is null) return null;
        feature.IsActive = !feature.IsActive;
        await db.SaveChangesAsync();
        return ToDto(feature);
    }

    private static FeatureDto ToDto(Feature f, string? sprintName = null, string? piName = null) => new()
    {
        Id = f.Id,
        SprintId = f.SprintId,
        Title = f.Title,
        Description = f.Description,
        ExternalTicketRef = f.ExternalTicketRef,
        Status = f.Status.ToString(),
        IsActive = f.IsActive,
        EstimatedDays = f.EstimatedDays,
        IsUnplanned = f.IsUnplanned,
        StartDate = f.StartDate,
        SprintName = sprintName,
        PiName = piName,
        Tasks = f.WorkItems.Select(w => new FeatureTaskDto
        {
            Id = w.Id,
            Title = w.Title,
            Type = w.Type.ToString(),
            Status = w.Status.ToString(),
            Assignee = $"{w.SprintMember.TeamMember.FirstName} {w.SprintMember.TeamMember.LastName}"
        }).OrderBy(t => t.Status).ThenBy(t => t.Assignee).ToList()
    };
}
