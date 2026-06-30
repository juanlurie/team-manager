namespace TeamManager.Api.Application.DTOs.MeetingSeries;

public record CreateMeetingSeriesSlotsRequest
{
    public List<CreateMeetingSeriesSlotRequest> Slots { get; init; } = [];
}