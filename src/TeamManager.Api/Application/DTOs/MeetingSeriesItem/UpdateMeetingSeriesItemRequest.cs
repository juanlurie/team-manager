namespace TeamManager.Api.Application.DTOs.MeetingSeriesItem;

public record UpdateMeetingSeriesItemRequest
{
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public int? DurationMinutes { get; init; }
    public List<UpdateMeetingSeriesItemParticipantRequest> Participants { get; init; } = [];
}

public record UpdateMeetingSeriesItemParticipantRequest
{
    public Guid TeamMemberId { get; init; }
    public string Role { get; init; } = string.Empty; // "Mandatory" or "Optional"
}