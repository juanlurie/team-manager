using TeamManager.Api.Application.DTOs.TeamMember;

namespace TeamManager.Api.Application.DTOs.MeetingSeriesItemAvailability;

public record MeetingSeriesItemAvailabilityDto
{
    public Guid Id { get; init; }
    public Guid MeetingSeriesItemId { get; init; }
    public Guid MeetingSeriesSlotId { get; init; }
    public Guid TeamMemberId { get; init; }
    public string? TeamMemberName { get; init; }
    public string? Notes { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}