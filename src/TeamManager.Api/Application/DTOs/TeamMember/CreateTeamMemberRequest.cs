using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Application.DTOs.TeamMember;

public record CreateTeamMemberRequest(
    string FirstName,
    string LastName,
    string Email,
    MemberRole Role,
    Guid? TeamLeadId,
    List<string>? Crafts = null
);
