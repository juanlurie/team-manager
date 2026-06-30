namespace TeamManager.Api.Application.DTOs.MeetingSeries;

public record MyMeetingSeriesDto
{
    public Guid SeriesId { get; init; }
    public string SeriesTitle { get; init; } = string.Empty;
    public string? SeriesDescription { get; init; }
    public int TotalItems { get; init; }
    public int OpenItems { get; init; }
    public int ConfirmedItems { get; init; }
    public string Role { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
}
