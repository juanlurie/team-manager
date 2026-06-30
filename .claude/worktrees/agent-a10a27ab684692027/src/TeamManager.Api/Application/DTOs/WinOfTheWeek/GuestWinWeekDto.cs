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
    public DateTimeOffset? HypeBattleEndsAt { get; init; }
    public DateTimeOffset? QuizEndsAt { get; init; }
    public string? QuizQuestion { get; init; }
    public IReadOnlyList<string> QuizOptions { get; init; } = [];
    public IReadOnlyList<Guid> QuizAnsweredMemberIds { get; init; } = [];
    public bool QuizRevealed { get; init; }
    public DateTimeOffset? QuizRevealEndsAt { get; init; }
    public int? QuizCorrectIndex { get; init; }
    public bool QuizIsAiGenerated { get; init; }
    public string? QuizWinnerName { get; init; }
    public IReadOnlyList<Guid> QuizEliminatedMemberIds { get; init; } = [];
    public IReadOnlyList<Guid> TiedNominationIds { get; init; } = [];
    public bool PowerUpsEnabled { get; init; }
    public bool HideVoteCounts { get; init; }
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
