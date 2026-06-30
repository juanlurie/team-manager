namespace TeamManager.Api.Application.DTOs.MeetingSeries;

public record CreateMeetingSeriesRequest
{
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public bool IsActive { get; init; } = true;
    public List<CreateMeetingSeriesSlotRequest> Slots { get; init; } = [];
}

public record CreateMeetingSeriesSlotRequest
{
    public string Date { get; init; } = string.Empty; // yyyy-MM-dd
    public string StartTime { get; init; } = string.Empty; // hh:mm
    public string EndTime { get; init; } = string.Empty; // hh:mm
    public Guid? LocationId { get; init; }
    public int SortOrder { get; init; }
}