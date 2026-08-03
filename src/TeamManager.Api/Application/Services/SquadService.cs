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
            .Include(s => s.Team)
            .Include(s => s.Members).ThenInclude(sm => sm.TeamMember)
            .OrderBy(s => s.Name)
            .ToListAsync();
        return squads.Select(ToDto).ToList();
    }

    public async Task<SquadDto?> GetByIdAsync(Guid id)
    {
        var squad = await db.Squads
            .Include(s => s.Team)
            .Include(s => s.Members).ThenInclude(sm => sm.TeamMember)
            .FirstOrDefaultAsync(s => s.Id == id);
        return squad is null ? null : ToDto(squad);
    }

    public async Task<SquadSaveResult> CreateAsync(CreateSquadRequest request)
    {
        if (!await TeamExistsAsync(request.TeamId)) return SquadSaveResult.TeamNotFound;

        var squad = new Squad { Name = request.Name.Trim(), Color = request.Color, TeamId = request.TeamId };
        db.Squads.Add(squad);
        await db.SaveChangesAsync();
        // Re-read so the response carries TeamName -- the tracked entity has TeamId but no Team.
        return SquadSaveResult.Ok(await GetByIdAsync(squad.Id) ?? ToDto(squad));
    }

    /// <summary>Name and colour only. Team membership moves through <see cref="SetTeamAsync"/>.</summary>
    public async Task<SquadDto?> UpdateAsync(Guid id, UpdateSquadRequest request)
    {
        var squad = await db.Squads.FindAsync(id);
        if (squad is null) return null;
        squad.Name = request.Name.Trim();
        squad.Color = request.Color;
        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    /// <summary>
    /// Moves a squad between teams, or out of one when <paramref name="teamId"/> is null. Its own
    /// operation rather than a field on the update path: there, an absent field was indistinguishable
    /// from an intentional detach, so every caller had to remember to echo the current value back.
    /// </summary>
    public async Task<SquadSaveResult> SetTeamAsync(Guid id, Guid? teamId)
    {
        var squad = await db.Squads.FindAsync(id);
        if (squad is null) return SquadSaveResult.NotFound;
        if (!await TeamExistsAsync(teamId)) return SquadSaveResult.TeamNotFound;

        squad.TeamId = teamId;
        await db.SaveChangesAsync();
        return SquadSaveResult.Ok((await GetByIdAsync(id))!);
    }

    /// <summary>Null is "no team", which is always valid; only a stated team has to exist.</summary>
    private async Task<bool> TeamExistsAsync(Guid? teamId) =>
        teamId is not { } id || await db.Teams.AnyAsync(t => t.Id == id);

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

    /// <summary>
    /// The one code path that owns SquadMember writes. <paramref name="save"/> exists for callers
    /// that need the membership change to land in the same SaveChanges as their own work -- access
    /// approval, where a separate save could leave a member holding access but no squad if the
    /// second write failed. Callers passing false must save.
    /// </summary>
    public async Task SetMemberSquadsAsync(Guid teamMemberId, List<Guid> squadIds, bool save = true)
    {
        var existing = await db.SquadMembers
            .Where(sm => sm.TeamMemberId == teamMemberId)
            .ToListAsync();
        db.SquadMembers.RemoveRange(existing);

        foreach (var squadId in squadIds.Distinct())
            db.SquadMembers.Add(new SquadMember { SquadId = squadId, TeamMemberId = teamMemberId });

        if (save) await db.SaveChangesAsync();
    }

    internal static SquadDto ToDto(Squad s) => new()
    {
        Id = s.Id,
        Name = s.Name,
        Color = s.Color,
        TeamId = s.TeamId,
        TeamName = s.Team?.Name,
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
        Color = s.Color,
        TeamId = s.TeamId,
        TeamName = s.Team?.Name
    };
}
