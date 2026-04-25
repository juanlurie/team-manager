using System.ComponentModel.DataAnnotations;
using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Application.DTOs.TeamMember;

public record UpdateTeamMemberRequest(
    [Required][MaxLength(100)] string FirstName,
    [Required][MaxLength(100)] string LastName,
    [Required][MaxLength(200)][EmailAddress] string Email,
    [Required] MemberRole Role,
    Guid? TeamLeadId,
    bool IsActive,
    List<string>? Crafts = null,
    DateOnly? BirthDate = null,
    DateOnly? JoinDate = null
);
