using TeamManager.Api.Application.DTOs.MeetingSeriesItemParticipant;
using TeamManager.Api.Application.DTOs.MeetingSeriesItemAvailability;

namespace TeamManager.Api.Application.DTOs.MeetingSeriesItem;

public record MeetingSeriesItemDto
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public int? DurationMinutes { get; init; }
    public Guid? ConfirmedSlotId { get; init; }
    public bool IsConfirmed { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    
    public List<MeetingSeriesItemParticipantDto> Participants { get; init; } = [];
    public List<MeetingSeriesItemAvailabilityDto> Availabilities { get; init; } = [];
}