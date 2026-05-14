namespace TeamManager.Api.Application.DTOs.WinOfTheWeek;

public record WinWeekHistoryDto
{
    public Guid Id { get; init; }
    public DateOnly WeekStart { get; init; }
    public DateOnly WeekEnd { get; init; }
    public string? WinnerNomineeName { get; init; }
    public string? WinnerTitle { get; init; }
    public string? WinnerDescription { get; init; }
    public int WinnerVoteCount { get; init; }
    public DateTimeOffset ClosedAt { get; init; }
}
