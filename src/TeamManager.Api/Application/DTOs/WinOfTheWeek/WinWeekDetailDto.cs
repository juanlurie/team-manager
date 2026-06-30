namespace TeamManager.Api.Application.DTOs.WinOfTheWeek;

public record WinWeekDetailDto
{
    public Guid Id { get; init; }
    public DateOnly WeekStart { get; init; }
    public DateOnly WeekEnd { get; init; }
    public string? WinnerNomineeName { get; init; }
    public string? WinnerTitle { get; init; }
    public List<WinNominationDto> AllNominations { get; init; } = [];
}
