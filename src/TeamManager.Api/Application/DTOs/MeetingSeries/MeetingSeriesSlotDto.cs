using TeamManager.Api.Application.DTOs.SlotLocation;

namespace TeamManager.Api.Application.DTOs.MeetingSeries;

public record MeetingSeriesSlotDto
{
    public Guid Id { get; init; }
    public DateOnly Date { get; init; }
    public TimeSpan StartTime { get; init; }
    public TimeSpan EndTime { get; init; }
    public Guid? LocationId { get; init; }
    public string? LocationName { get; init; }
    public string? LocationColor { get; init; }
    public int SortOrder { get; init; }
}