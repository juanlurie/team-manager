namespace TeamManager.Api.Application.DTOs.WinOfTheWeek;

public record GuestWinWeekDto
{
    public Guid Id { get; init; }
    public DateOnly WeekStart { get; init; }
    public string Status { get; init; } = string.Empty;
    public bool IsNominatingOpen { get; init; }
    public bool IsVotingOpen { get; init; }
    public int UserNominationsRemaining { get; init; }
    public int UserVotesRemaining { get; init; }
    public string? WinnerNomineeName { get; init; }
    public string? WinnerTitle { get; init; }
    public string? WinnerStory { get; init; }
    public DateTimeOffset? SuddenDeathEndsAt { get; init; }
    public IReadOnlyList<Guid> TiedNominationIds { get; init; } = [];
    public bool PowerUpsEnabled { get; init; }
    public int GuestTokenBalance { get; init; }
    public IReadOnlyList<GuestNominationDto> Nominations { get; init; } = [];
}

public record GuestNominationDto
{
    public Guid Id { get; init; }
    public Guid NomineeMemberId { get; init; }
    public string NomineeName { get; init; } = string.Empty;
    public string NominatorDisplayName { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public int VoteCount { get; init; }
    public bool HasVoted { get; init; }
    public bool IsOwned { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public string? PowerUp { get; init; }
    public string? ChaosCard { get; init; }
    public int HypeMeterCount { get; init; }
}
