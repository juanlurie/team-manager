using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Squad;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class SquadService(AppDbContext db)
{
    public async Task<IReadOnlyList<SquadDto>> GetAllAsync()
    {
        var squads = await db.Squads
            .Include(s => s.Members).ThenInclude(sm => sm.TeamMember)
            .OrderBy(s => s.Name)
            .ToListAsync();
        return squads.Select(ToDto).ToList();
    }

    public async Task<SquadDto?> GetByIdAsync(Guid id)
    {
        var squad = await db.Squads
            .Include(s => s.Members).ThenInclude(sm => sm.TeamMember)
            .FirstOrDefaultAsync(s => s.Id == id);
        return squad is null ? null : ToDto(squad);
    }

    public async Task<SquadDto> CreateAsync(CreateSquadRequest request)
    {
        var squad = new Squad { Name = request.Name.Trim(), Color = request.Color };
        db.Squads.Add(squad);
        await db.SaveChangesAsync();
        return ToDto(squad);
    }

    public async Task<SquadDto?> UpdateAsync(Guid id, CreateSquadRequest request)
    {
        var squad = await db.Squads.FindAsync(id);
        if (squad is null) return null;
        squad.Name = request.Name.Trim();
        squad.Color = request.Color;
        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var squad = await db.Squads.FindAsync(id);
        if (squad is null) return false;
        db.Squads.Remove(squad);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<SquadDto?> SetMembersAsync(Guid squadId, List<Guid> memberIds)
    {
        var squad = await db.Squads.Include(s => s.Members).FirstOrDefaultAsync(s => s.Id == squadId);
        if (squad is null) return null;

        db.SquadMembers.RemoveRange(squad.Members);
        foreach (var memberId in memberIds.Distinct())
            db.SquadMembers.Add(new SquadMember { SquadId = squadId, TeamMemberId = memberId });

        await db.SaveChangesAsync();
        return await GetByIdAsync(squadId);
    }

    public async Task SetMemberSquadsAsync(Guid teamMemberId, List<Guid> squadIds)
    {
        var existing = await db.SquadMembers
            .Where(sm => sm.TeamMemberId == teamMemberId)
            .ToListAsync();
        db.SquadMembers.RemoveRange(existing);

        foreach (var squadId in squadIds.Distinct())
            db.SquadMembers.Add(new SquadMember { SquadId = squadId, TeamMemberId = teamMemberId });

        await db.SaveChangesAsync();
    }

    internal static SquadDto ToDto(Squad s) => new()
    {
        Id = s.Id,
        Name = s.Name,
        Color = s.Color,
        Members = s.Members
            .OrderBy(sm => sm.TeamMember?.LastName).ThenBy(sm => sm.TeamMember?.FirstName)
            .Select(sm => new SquadMemberEntryDto
            {
                TeamMemberId = sm.TeamMemberId,
                FullName = sm.TeamMember is not null
                    ? $"{sm.TeamMember.FirstName} {sm.TeamMember.LastName}"
                    : string.Empty
            }).ToList()
    };

    internal static SquadSummaryDto ToSummaryDto(Domain.Entities.Squad s) => new()
    {
        Id = s.Id,
        Name = s.Name,
        Color = s.Color
    };
}
