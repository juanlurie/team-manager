using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.RetroAction;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class RetroActionService(AppDbContext db) : IRetroActionService
{
    public async Task<IReadOnlyList<RetroActionDto>> GetBySprintAsync(Guid sprintId)
    {
        var items = await db.RetroActions
            .Where(r => r.SprintId == sprintId)
            .OrderBy(r => r.CreatedAt)
            .ToListAsync();
        return items.Select(ToDto).ToList();
    }

    public async Task<RetroActionDto> CreateAsync(CreateRetroActionRequest request)
    {
        var action = new RetroAction
        {
            SprintId   = request.SprintId,
            Title      = request.Title,
            Notes      = request.Notes,
            AssignedTo = request.AssignedTo,
            Status     = request.Status,
            DueDate    = request.DueDate,
        };
        db.RetroActions.Add(action);
        await db.SaveChangesAsync();
        return ToDto(action);
    }

    public async Task<RetroActionDto?> UpdateAsync(Guid id, CreateRetroActionRequest request)
    {
        var action = await db.RetroActions.FindAsync(id);
        if (action is null) return null;
        action.Title      = request.Title;
        action.Notes      = request.Notes;
        action.AssignedTo = request.AssignedTo;
        action.Status     = request.Status;
        action.DueDate    = request.DueDate;
        action.UpdatedAt  = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return ToDto(action);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var action = await db.RetroActions.FindAsync(id);
        if (action is null) return false;
        db.RetroActions.Remove(action);
        await db.SaveChangesAsync();
        return true;
    }

    private static RetroActionDto ToDto(RetroAction r) => new()
    {
        Id         = r.Id,
        SprintId   = r.SprintId,
        Title      = r.Title,
        Notes      = r.Notes,
        AssignedTo = r.AssignedTo,
        Status     = r.Status,
        DueDate    = r.DueDate,
        CreatedAt  = r.CreatedAt,
        UpdatedAt  = r.UpdatedAt,
    };
}
