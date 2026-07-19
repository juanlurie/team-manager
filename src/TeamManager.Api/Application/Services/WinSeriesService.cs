using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.WinOfTheWeek;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class WinSeriesService(AppDbContext db)
{
    /// <summary>Resolves the series to act on: the one requested, or the oldest series as the default
    /// when none is given. Returns Guid.Empty when no series exists yet.</summary>
    public async Task<Guid> ResolveSeriesIdAsync(Guid? seriesId)
    {
        if (seriesId.HasValue && seriesId.Value != Guid.Empty)
            return seriesId.Value;

        var first = await db.WinSeries.OrderBy(s => s.CreatedAt).Select(s => (Guid?)s.Id).FirstOrDefaultAsync();
        return first ?? Guid.Empty;
    }

    public async Task<IReadOnlyList<WinSeriesDto>> GetAllAsync()
    {
        return await db.WinSeries
            .OrderBy(s => s.CreatedAt)
            .Select(s => new WinSeriesDto { Id = s.Id, Name = s.Name, CreatedAt = s.CreatedAt, PowerUpsEnabled = s.PowerUpsEnabled, HideVoteCounts = s.HideVoteCounts })
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

        return new WinSeriesDto { Id = series.Id, Name = series.Name, CreatedAt = series.CreatedAt, PowerUpsEnabled = series.PowerUpsEnabled, HideVoteCounts = series.HideVoteCounts };
    }

    public async Task<WinSeriesDto> TogglePowerUpsAsync(Guid seriesId)
    {
        var series = await db.WinSeries.FindAsync(seriesId)
            ?? throw new KeyNotFoundException("Series not found.");
        series.PowerUpsEnabled = !series.PowerUpsEnabled;
        await db.SaveChangesAsync();
        return new WinSeriesDto { Id = series.Id, Name = series.Name, CreatedAt = series.CreatedAt, PowerUpsEnabled = series.PowerUpsEnabled, HideVoteCounts = series.HideVoteCounts };
    }

    public async Task<WinSeriesDto> ToggleHideVoteCountsAsync(Guid seriesId)
    {
        var series = await db.WinSeries.FindAsync(seriesId)
            ?? throw new KeyNotFoundException("Series not found.");
        series.HideVoteCounts = !series.HideVoteCounts;
        await db.SaveChangesAsync();
        return new WinSeriesDto { Id = series.Id, Name = series.Name, CreatedAt = series.CreatedAt, PowerUpsEnabled = series.PowerUpsEnabled, HideVoteCounts = series.HideVoteCounts };
    }
}
