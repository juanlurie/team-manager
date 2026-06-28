using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.PI;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class PIService(AppDbContext db) : IPIService
{
    public async Task<IReadOnlyList<PIDto>> GetAllAsync()
    {
        var pis = await db.PIs.OrderByDescending(p => p.StartDate).ToListAsync();
        return pis.Select(ToDto).ToList();
    }

    public async Task<PIDto?> GetByIdAsync(Guid id)
    {
        var pi = await db.PIs.FindAsync(id);
        return pi is null ? null : ToDto(pi);
    }

    public async Task<PIDto> CreateAsync(CreatePIRequest request)
    {
        var pi = new PI
        {
            Name = request.Name,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Description = request.Description
        };
        db.PIs.Add(pi);
        await db.SaveChangesAsync();
        return ToDto(pi);
    }

    public async Task<PIDto?> UpdateAsync(Guid id, CreatePIRequest request)
    {
        var pi = await db.PIs.FindAsync(id);
        if (pi is null) return null;

        pi.Name = request.Name;
        pi.StartDate = request.StartDate;
        pi.EndDate = request.EndDate;
        pi.Description = request.Description;

        await db.SaveChangesAsync();
        return ToDto(pi);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var pi = await db.PIs.FindAsync(id);
        if (pi is null) return false;
        db.PIs.Remove(pi);
        await db.SaveChangesAsync();
        return true;
    }

    internal static PIDto ToDto(PI pi) => new()
    {
        Id = pi.Id,
        Name = pi.Name,
        StartDate = pi.StartDate,
        EndDate = pi.EndDate,
        Description = pi.Description
    };
}
