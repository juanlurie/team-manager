namespace TeamManager.Api.Application.DTOs.WinOfTheMonth;

public record WinMonthHistoryDto
{
    public Guid Id { get; init; }
    public int Year { get; init; }
    public int Month { get; init; }
    public string MonthName { get; init; } = string.Empty;
    public string? WinnerNomineeName { get; init; }
    public string? WinnerTitle { get; init; }
    public int WinnerVoteCount { get; init; }
    public DateTimeOffset ClosedAt { get; init; }
}
