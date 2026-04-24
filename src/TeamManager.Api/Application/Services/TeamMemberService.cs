using AutoMapper;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.TeamMember;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class TeamMemberService(AppDbContext db, IMapper mapper) : ITeamMemberService
{
    public async Task<IReadOnlyList<TeamMemberDto>> GetAllAsync(string? role, Guid? teamLeadId, bool? isActive)
    {
        var query = db.TeamMembers
            .Include(m => m.TeamLead)
            .Include(m => m.Achievements).ThenInclude(a => a.Achievement)
            .AsQueryable();

        if (role is not null && Enum.TryParse<MemberRole>(role, true, out var parsedRole))
            query = query.Where(m => m.Role == parsedRole);

        if (teamLeadId.HasValue)
            query = query.Where(m => m.TeamLeadId == teamLeadId);

        if (isActive.HasValue)
            query = query.Where(m => m.IsActive == isActive);

        var members = await query.OrderBy(m => m.LastName).ThenBy(m => m.FirstName).ToListAsync();
        return mapper.Map<List<TeamMemberDto>>(members);
    }

    public async Task<TeamMemberDto?> GetByIdAsync(Guid id)
    {
        var member = await db.TeamMembers
            .Include(m => m.TeamLead)
            .Include(m => m.Achievements).ThenInclude(a => a.Achievement)
            .FirstOrDefaultAsync(m => m.Id == id);
        return member is null ? null : mapper.Map<TeamMemberDto>(member);
    }

    public async Task<TeamMemberDto> CreateAsync(CreateTeamMemberRequest request)
    {
        var member = new TeamMember
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            Role = request.Role,
            TeamLeadId = request.TeamLeadId,
            Crafts = request.Crafts ?? []
        };
        db.TeamMembers.Add(member);
        await db.SaveChangesAsync();
        return await GetByIdAsync(member.Id) ?? mapper.Map<TeamMemberDto>(member);
    }

    public async Task<TeamMemberDto?> UpdateAsync(Guid id, UpdateTeamMemberRequest request)
    {
        var member = await db.TeamMembers.FindAsync(id);
        if (member is null) return null;

        member.FirstName = request.FirstName;
        member.LastName = request.LastName;
        member.Email = request.Email;
        member.Role = request.Role;
        member.TeamLeadId = request.TeamLeadId;
        member.IsActive = request.IsActive;
        member.Crafts = request.Crafts ?? [];

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
}
