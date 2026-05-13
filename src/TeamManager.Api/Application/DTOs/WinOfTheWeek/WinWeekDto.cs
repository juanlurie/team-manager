namespace TeamManager.Api.Application.DTOs.WinOfTheWeek;

public record WinWeekDto
{
    public Guid Id { get; init; }
    public DateOnly WeekStart { get; init; }
    public string Status { get; init; } = string.Empty;
    public Guid? WinnerNominationId { get; init; }
    public string? WinnerTitle { get; init; }
    public string? WinnerNomineeName { get; init; }
    public DateTimeOffset OpenedAt { get; init; }
    public DateTimeOffset? ClosedAt { get; init; }
    public int UserVotesRemaining { get; init; }
    public int UserNominationsRemaining { get; init; }
    public List<WinNominationDto> Nominations { get; init; } = [];
}
