namespace TeamManager.Api.Application.DTOs.MeetingSeries;

public record UpdateMeetingSeriesRequest
{
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public bool IsActive { get; init; } = true;
}