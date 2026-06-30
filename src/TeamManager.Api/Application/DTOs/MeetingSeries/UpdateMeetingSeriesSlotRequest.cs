namespace TeamManager.Api.Application.DTOs.MeetingSeries;

public record UpdateMeetingSeriesSlotRequest
{
    public string Date { get; init; } = string.Empty; // yyyy-MM-dd
    public string StartTime { get; init; } = string.Empty; // hh:mm
    public string EndTime { get; init; } = string.Empty; // hh:mm
    public Guid? LocationId { get; init; }
    public int SortOrder { get; init; }
}