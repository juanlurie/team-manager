namespace TeamManager.Api.Application.DTOs.MeetingSeriesItemAvailability;

public record AddMeetingSeriesItemAvailabilityRequest
{
    public Guid MeetingSeriesSlotId { get; init; }
    public Guid TeamMemberId { get; init; }
    public string? Notes { get; init; }
}