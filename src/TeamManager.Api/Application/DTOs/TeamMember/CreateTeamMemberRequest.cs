using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.TeamMember;

// No Role here by design -- see UpdateMemberRoleRequest. New members start as Member and are
// promoted through the dedicated role endpoint, which audits the change.
public record CreateTeamMemberRequest(
    [Required][MaxLength(100)] string FirstName,
    [Required][MaxLength(100)] string LastName,
    [Required][MaxLength(200)][EmailAddress] string Email,
    Guid? TeamLeadId,
    List<string>? Crafts = null,
    DateOnly? BirthDate = null,
    DateOnly? JoinDate = null
);
