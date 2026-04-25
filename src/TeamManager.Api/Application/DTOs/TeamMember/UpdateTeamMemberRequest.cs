using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Application.DTOs.TeamMember;

public record UpdateTeamMemberRequest(
    string FirstName,
    string LastName,
    string Email,
    MemberRole Role,
    Guid? TeamLeadId,
    bool IsActive,
    List<string>? Crafts = null,
    DateOnly? BirthDate = null,
    DateOnly? JoinDate = null
);
