namespace TeamManager.Api.Application.DTOs.SessionDefinition;

public record SessionDefinitionSlotDto
{
    public Guid Id { get; init; }
    public Guid SessionDefinitionId { get; init; }
    public string Date { get; init; } = string.Empty;
    public string StartTime { get; init; } = string.Empty;
    public string EndTime { get; init; } = string.Empty;
    public Guid? LocationId { get; init; }
    public string? LocationName { get; init; }
    public string? LocationColor { get; init; }
    public bool IsConfirmed { get; init; }
    public int BookingCount { get; init; }
    public int MandatoryCount { get; init; }
    public Guid? ConnectedMeetingSessionId { get; init; }
    public string? ConnectedMeetingSessionTitle { get; init; }
    public List<SessionDefinitionBookingDto> Bookings { get; init; } = [];
}
