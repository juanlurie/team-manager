namespace TeamManager.Api.Application.DTOs.WinOfTheWeek;

public record WinWeekDto
{
    public Guid Id { get; init; }
    public Guid SeriesId { get; init; }
    public string SeriesName { get; init; } = string.Empty;
    public DateOnly WeekStart { get; init; }
    public string Status { get; init; } = string.Empty;
    public Guid? WinnerNominationId { get; init; }
    public string? WinnerTitle { get; init; }
    public string? WinnerNomineeName { get; init; }
    public DateTimeOffset OpenedAt { get; init; }
    public DateTimeOffset? ClosedAt { get; init; }
    public DateTimeOffset? SuddenDeathEndsAt { get; init; }
    public DateTimeOffset? HypeBattleEndsAt { get; init; }
    public DateTimeOffset? QuizEndsAt { get; init; }
    public string? QuizQuestion { get; init; }
    public List<string> QuizOptions { get; init; } = [];
    public List<Guid> QuizAnsweredMemberIds { get; init; } = [];
    public bool QuizEligible { get; init; }
    public bool QuizRevealed { get; init; }
    public DateTimeOffset? QuizRevealEndsAt { get; init; }
    public int? QuizCorrectIndex { get; init; }
    public bool QuizIsAiGenerated { get; init; }
    public int? QuizMyAnswerIndex { get; init; }
    public Guid? QuizWinnerMemberId { get; init; }
    public string? QuizWinnerName { get; init; }
    public List<Guid> QuizEliminatedMemberIds { get; init; } = [];
    public Guid CurrentMemberId { get; init; }
    public int UserVotesRemaining { get; init; }
    public int UserNominationsRemaining { get; init; }
    public int TotalVotesCast { get; init; }
    public int ActiveMemberCount { get; init; }
    public int ConnectedMemberCount { get; init; }
    public List<Guid> TiedNominationIds { get; init; } = [];
    public string? WinnerStory { get; init; }
    public bool PowerUpsEnabled { get; init; }
    public bool HideVoteCounts { get; init; }
    public string? GuestToken { get; init; }
    public List<WinNominationDto> Nominations { get; init; } = [];
}
