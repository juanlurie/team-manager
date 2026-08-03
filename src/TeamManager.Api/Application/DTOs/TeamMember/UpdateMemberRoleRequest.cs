using System.ComponentModel.DataAnnotations;
using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Application.DTOs.TeamMember;

/// <summary>
/// Body of PUT /api/v1/team-members/{id}/role. Role assignment lives on its own endpoint with
/// its own gate and its own audit row -- deliberately not a field on the general update DTO.
/// </summary>
/// <remarks>
/// Role is nullable so [Required] actually bites: on a non-nullable enum a missing field binds
/// to 0 (Member) and would silently demote instead of failing validation.
/// </remarks>
public record UpdateMemberRoleRequest([Required] MemberRole? Role);
