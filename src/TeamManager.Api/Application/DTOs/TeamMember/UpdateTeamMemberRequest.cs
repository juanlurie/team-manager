using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.TeamMember;

// No Role here by design -- see UpdateMemberRoleRequest. A role field on a general-purpose
// update DTO is what let any authenticated member promote themselves.
public record UpdateTeamMemberRequest(
    [Required][MaxLength(100)] string FirstName,
    [Required][MaxLength(100)] string LastName,
    [Required][MaxLength(200)][EmailAddress] string Email,
    Guid? TeamLeadId,
    bool IsActive,
    List<string>? Crafts = null,
    DateOnly? BirthDate = null,
    DateOnly? JoinDate = null
);
