using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.WinOfTheWeek;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class WinSeriesService(AppDbContext db)
{
    public async Task<IReadOnlyList<WinSeriesDto>> GetAllAsync()
    {
        return await db.WinSeries
            .OrderBy(s => s.CreatedAt)
            .Select(s => new WinSeriesDto { Id = s.Id, Name = s.Name, CreatedAt = s.CreatedAt })
            .ToListAsync();
    }

    public async Task<WinSeriesDto> CreateAsync(string name, Guid createdByMemberId)
    {
        var series = new WinSeries
        {
            Name = name.Trim(),
            CreatedByMemberId = createdByMemberId
        };

        db.WinSeries.Add(series);
        await db.SaveChangesAsync();

        return new WinSeriesDto { Id = series.Id, Name = series.Name, CreatedAt = series.CreatedAt };
    }
}
