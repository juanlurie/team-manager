using TeamManager.Api.Application.DTOs.WinOfTheMonth;

namespace TeamManager.Api.Application.DTOs.WinOfTheMonth;

public record WinMonthDto
{
    public Guid Id { get; init; }
    public int Year { get; init; }
    public int Month { get; init; }
    public string Status { get; init; } = string.Empty;
    public string MonthName { get; init; } = string.Empty;
    public DateTimeOffset VotingEndsAt { get; init; }
    public Guid? WinnerNominationId { get; init; }
    public string? WinnerNomineeName { get; init; }
    public string? WinnerTitle { get; init; }
    public Guid CurrentMemberId { get; init; }
    public int UserVotesRemaining { get; init; }
    public bool HasUserVoted { get; init; }
    public List<WinMonthNominationDto> Nominations { get; init; } = [];
}
