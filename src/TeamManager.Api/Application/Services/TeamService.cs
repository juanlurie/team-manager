using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Team;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class TeamService(AppDbContext db)
{
    public async Task<IReadOnlyList<TeamDto>> GetAllAsync()
    {
        var teams = await db.Teams
            .Include(t => t.Squads)
            .OrderBy(t => t.Name)
            .ToListAsync();
        return teams.Select(ToDto).ToList();
    }

    public async Task<TeamDto?> GetByIdAsync(Guid id)
    {
        var team = await db.Teams
            .Include(t => t.Squads)
            .FirstOrDefaultAsync(t => t.Id == id);
        return team is null ? null : ToDto(team);
    }

    public async Task<TeamSaveResult> CreateAsync(CreateTeamRequest request)
    {
        var name = request.Name.Trim();
        if (await db.Teams.AnyAsync(t => t.Name == name))
            return TeamSaveResult.DuplicateName;

        var team = new Domain.Entities.Team { Name = name };
        db.Teams.Add(team);
        await db.SaveChangesAsync();
        return TeamSaveResult.Ok(ToDto(team));
    }

    public async Task<TeamSaveResult> UpdateAsync(Guid id, CreateTeamRequest request)
    {
        var team = await db.Teams.FindAsync(id);
        if (team is null) return TeamSaveResult.NotFound;

        var name = request.Name.Trim();
        if (await db.Teams.AnyAsync(t => t.Name == name && t.Id != id))
            return TeamSaveResult.DuplicateName;

        team.Name = name;
        await db.SaveChangesAsync();

        var updated = await GetByIdAsync(id);
        return updated is null ? TeamSaveResult.NotFound : TeamSaveResult.Ok(updated);
    }

    /// <summary>
    /// Deleting a team detaches its squads (Squad.TeamId is SetNull); it never deletes them,
    /// and never touches squad membership.
    /// </summary>
    public async Task<bool> DeleteAsync(Guid id)
    {
        var team = await db.Teams.FindAsync(id);
        if (team is null) return false;
        db.Teams.Remove(team);
        await db.SaveChangesAsync();
        return true;
    }

    internal static TeamDto ToDto(Domain.Entities.Team t) => new()
    {
        Id = t.Id,
        Name = t.Name,
        Squads = t.Squads
            .OrderBy(s => s.Name)
            .Select(s => new TeamSquadEntryDto { Id = s.Id, Name = s.Name, Color = s.Color })
            .ToList()
    };

    internal static TeamSummaryDto ToSummaryDto(Domain.Entities.Team t) => new()
    {
        Id = t.Id,
        Name = t.Name
    };
}
