namespace TeamManager.Api.Application.DTOs.WinOfTheWeek;

public record WinNominationDto
{
    public Guid Id { get; init; }
    public Guid WinWeekId { get; init; }
    public Guid? TeamMemberId { get; init; }
    public string TeamMemberName { get; init; } = string.Empty;
    public bool IsGuestNomination { get; init; }
    public Guid NomineeMemberId { get; init; }
    public string NomineeName { get; init; } = string.Empty;
    public List<Guid> NomineeMemberIds { get; init; } = [];
    public List<string> NomineeNames { get; init; } = [];
    public string? NomineeAvatarSeed { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public int VoteCount { get; init; }
    public bool HasVoted { get; init; }
    public string? PowerUp { get; init; }
    public string? ChaosCard { get; init; }
    public int HypeMeterCount { get; init; }
}
