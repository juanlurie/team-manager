using TeamManager.Api.Application.DTOs.TeamMember;
using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface ITeamMemberService
{
    Task<IReadOnlyList<TeamMemberDto>> GetAllAsync(string? role, Guid? teamLeadId, bool? isActive);
    Task<TeamMemberDto?> GetByIdAsync(Guid id);
    Task<TeamMemberDto> CreateAsync(CreateTeamMemberRequest request);
    Task<TeamMemberDto?> UpdateAsync(Guid id, UpdateTeamMemberRequest request);

    /// <summary>
    /// The only path that writes <see cref="Domain.Entities.TeamMember.Role"/>. Enforces the
    /// Admin-only escalation rules and the last-Admin guard, and records an audit row.
    /// <paramref name="callerIsAdmin"/> comes from the caller's role claim; the role attribute on
    /// the endpoint gets you as far as "is a lead", this decides the rest.
    /// </summary>
    Task<RoleChangeResult> UpdateRoleAsync(Guid id, MemberRole newRole, Guid actorId, bool callerIsAdmin);
    Task<TeamMemberDto?> UpdateAvatarAsync(Guid id, string? seed);
    Task<bool> DeleteAsync(Guid id);
}
