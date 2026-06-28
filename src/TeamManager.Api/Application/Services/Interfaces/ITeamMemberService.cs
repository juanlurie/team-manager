using TeamManager.Api.Application.DTOs.TeamMember;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface ITeamMemberService
{
    Task<IReadOnlyList<TeamMemberDto>> GetAllAsync(string? role, Guid? teamLeadId, bool? isActive);
    Task<TeamMemberDto?> GetByIdAsync(Guid id);
    Task<TeamMemberDto> CreateAsync(CreateTeamMemberRequest request);
    Task<TeamMemberDto?> UpdateAsync(Guid id, UpdateTeamMemberRequest request);
    Task<bool> DeleteAsync(Guid id);
}
