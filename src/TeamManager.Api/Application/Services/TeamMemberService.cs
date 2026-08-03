using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Achievement;
using TeamManager.Api.Application.DTOs.Squad;
using TeamManager.Api.Application.DTOs.TeamMember;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;
// Aliased: Domain.Entities and DTOs.Team both define a "Team", and this file needs the entity.
using TeamSummaryDto = TeamManager.Api.Application.DTOs.Team.TeamSummaryDto;

namespace TeamManager.Api.Application.Services;

public class TeamMemberService(AppDbContext db) : ITeamMemberService
{
    public async Task<IReadOnlyList<TeamMemberDto>> GetAllAsync(string? role, Guid? teamLeadId, bool? isActive)
    {
        var query = db.TeamMembers
            .Include(m => m.TeamLead)
            .Include(m => m.Achievements).ThenInclude(a => a.Achievement)
            .Include(m => m.SquadMemberships).ThenInclude(sm => sm.Squad).ThenInclude(s => s.Team)
            .AsQueryable();

        if (role is not null && Enum.TryParse<MemberRole>(role, true, out var parsedRole))
            query = query.Where(m => m.Role == parsedRole);

        if (teamLeadId.HasValue)
            query = query.Where(m => m.TeamLeadId == teamLeadId);

        if (isActive.HasValue)
            query = query.Where(m => m.IsActive == isActive);

        var members = await query.OrderBy(m => m.LastName).ThenBy(m => m.FirstName).ToListAsync();
        return members.Select(ToDto).ToList();
    }

    public async Task<TeamMemberDto?> GetByIdAsync(Guid id)
    {
        var member = await db.TeamMembers
            .Include(m => m.TeamLead)
            .Include(m => m.Achievements).ThenInclude(a => a.Achievement)
            .Include(m => m.SquadMemberships).ThenInclude(sm => sm.Squad).ThenInclude(s => s.Team)
            .FirstOrDefaultAsync(m => m.Id == id);
        return member is null ? null : ToDto(member);
    }

    public async Task<TeamMemberDto> CreateAsync(CreateTeamMemberRequest request)
    {
        var existing = await db.TeamMembers
            .FirstOrDefaultAsync(m => m.Email.ToLower() == request.Email.ToLower());

        if (existing is not null)
        {
            if (!existing.IsActive)
            {
                // Role is deliberately left alone: reactivating a member restores their details,
                // it is not a way to hand out a role without going through UpdateRoleAsync.
                existing.FirstName = request.FirstName;
                existing.LastName = request.LastName;
                existing.TeamLeadId = request.TeamLeadId;
                existing.Crafts = request.Crafts ?? [];
                existing.BirthDate = request.BirthDate;
                existing.JoinDate = request.JoinDate;
                existing.IsActive = true;
                await db.SaveChangesAsync();
                return await GetByIdAsync(existing.Id) ?? ToDto(existing);
            }
            throw new InvalidOperationException("A team member with this email address already exists and is active.");
        }

        var member = new TeamMember
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            // Role defaults to Member; promoting happens through UpdateRoleAsync.
            TeamLeadId = request.TeamLeadId,
            Crafts = request.Crafts ?? [],
            BirthDate = request.BirthDate,
            JoinDate = request.JoinDate
        };
        db.TeamMembers.Add(member);
        await db.SaveChangesAsync();
        return await GetByIdAsync(member.Id) ?? ToDto(member);
    }

    public async Task<TeamMemberDto?> UpdateAsync(Guid id, UpdateTeamMemberRequest request)
    {
        var member = await db.TeamMembers.FindAsync(id);
        if (member is null) return null;

        // Role is not settable here -- see UpdateRoleAsync.
        member.FirstName = request.FirstName;
        member.LastName = request.LastName;
        member.Email = request.Email;
        member.TeamLeadId = request.TeamLeadId;
        member.IsActive = request.IsActive;
        member.Crafts = request.Crafts ?? [];
        member.BirthDate = request.BirthDate;
        member.JoinDate = request.JoinDate;

        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<RoleChangeResult> UpdateRoleAsync(Guid id, MemberRole newRole, Guid actorId, bool callerIsAdmin)
    {
        var member = await db.TeamMembers.FindAsync(id);
        if (member is null) return RoleChangeResult.NotFound;

        // Only an Admin may create an Admin or touch one. Without this, any TeamLead could mint
        // Admins and the tier would be decorative.
        if (!callerIsAdmin && (newRole == MemberRole.Admin || member.Role == MemberRole.Admin))
            return RoleChangeResult.Forbidden;

        var previousRole = member.Role;
        if (previousRole == newRole)
            return RoleChangeResult.Ok(await GetByIdAsync(id) ?? ToDto(member));

        // Last-Admin guard. Because only an Admin can create an Admin, demoting the final one is
        // unrecoverable from inside the app. Counts inactive Admins too: deactivation is
        // reversible from the member form, so a deactivated Admin is not a lockout the way a
        // demoted one is.
        if (previousRole == MemberRole.Admin)
        {
            var remainingAdmins = await db.TeamMembers.CountAsync(m => m.Role == MemberRole.Admin && m.Id != id);
            if (remainingAdmins == 0) return RoleChangeResult.LastAdmin;
        }

        member.Role = newRole;
        db.MemberRoleChanges.Add(new MemberRoleChange
        {
            MemberId = id,
            ActorId = actorId == Guid.Empty ? null : actorId,
            FromRole = previousRole,
            ToRole = newRole
        });
        await db.SaveChangesAsync();

        return RoleChangeResult.Ok(await GetByIdAsync(id) ?? ToDto(member));
    }

    public async Task<TeamMemberDto?> UpdateAvatarAsync(Guid id, string? seed)
    {
        var member = await db.TeamMembers.FindAsync(id);
        if (member is null) return null;
        member.AvatarSeed = string.IsNullOrWhiteSpace(seed) ? null : seed.Trim();
        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var member = await db.TeamMembers.FindAsync(id);
        if (member is null) return false;
        member.IsActive = false;
        await db.SaveChangesAsync();
        return true;
    }

    internal static TeamMemberDto ToDto(TeamMember m) => new()
    {
        Id = m.Id,
        FirstName = m.FirstName,
        LastName = m.LastName,
        Email = m.Email,
        Role = m.Role.ToString(),
        TeamLeadId = m.TeamLeadId,
        TeamLeadName = m.TeamLead is not null ? $"{m.TeamLead.FirstName} {m.TeamLead.LastName}" : null,
        Crafts = m.Crafts,
        AvatarSeed = m.AvatarSeed,
        IsActive = m.IsActive,
        CreatedAt = m.CreatedAt,
        BirthDate = m.BirthDate,
        JoinDate = m.JoinDate,
        Achievements = m.Achievements.Select(a => new BadgeDto
        {
            Id = a.Id,
            Icon = a.Achievement.Icon,
            Name = a.Achievement.Name,
            Category = a.Achievement.Category
        }).ToList(),
        Squads = m.SquadMemberships
            .OrderBy(sm => sm.Squad?.Name)
            .Select(sm => new SquadSummaryDto
            {
                Id = sm.Squad.Id,
                Name = sm.Squad.Name,
                Color = sm.Squad.Color,
                TeamId = sm.Squad.TeamId,
                TeamName = sm.Squad.Team?.Name
            }).ToList(),
        // A member's teams are a set, derived here so the rule lives in one place rather than in
        // every component that displays it: distinct non-null Squad.Team, ordered by name. Squads
        // with no team contribute nothing -- they are not a "No team" pseudo-team.
        Teams = m.SquadMemberships
            .Select(sm => sm.Squad?.Team)
            .Where(t => t is not null)
            .Select(t => t!)
            .DistinctBy(t => t.Id)
            .OrderBy(t => t.Name)
            .Select(t => new TeamSummaryDto { Id = t.Id, Name = t.Name })
            .ToList()
    };
}
