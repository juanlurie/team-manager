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
    public DateTimeOffset? SuddenDeathEndsAt { get; init; }
    public Guid CurrentMemberId { get; init; }
    public int UserVotesRemaining { get; init; }
    public int UserNominationsRemaining { get; init; }
    public int TotalVotesCast { get; init; }
    public int ActiveMemberCount { get; init; }
    public int ConnectedMemberCount { get; init; }
    public List<Guid> TiedNominationIds { get; init; } = [];
    public string? WinnerStory { get; init; }
    public List<WinNominationDto> Nominations { get; init; } = [];
}
