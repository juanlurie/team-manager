namespace TeamManager.Api.Application.DTOs.WinOfTheMonth;

public record WinMonthNominationDto
{
    public Guid Id { get; init; }
    public Guid SourceWinWeekId { get; init; }
    public string NomineeName { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public int VoteCount { get; init; }
    public bool HasVoted { get; init; }
    public DateOnly SourceWeekStart { get; init; }
}
