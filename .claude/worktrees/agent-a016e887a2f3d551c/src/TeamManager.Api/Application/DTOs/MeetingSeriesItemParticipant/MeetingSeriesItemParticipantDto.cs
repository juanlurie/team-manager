using TeamManager.Api.Application.DTOs.TeamMember;

namespace TeamManager.Api.Application.DTOs.MeetingSeriesItemParticipant;

public record MeetingSeriesItemParticipantDto
{
    public Guid Id { get; init; }
    public Guid TeamMemberId { get; init; }
    public string? TeamMemberName { get; init; }
    public string Role { get; init; } = string.Empty; // "Mandatory" or "Optional"
}