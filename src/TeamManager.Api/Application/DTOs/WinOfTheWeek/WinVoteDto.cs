namespace TeamManager.Api.Application.DTOs.WinOfTheWeek;

public record WinVoteDto
{
    public Guid Id { get; init; }
    public Guid WinNominationId { get; init; }
    public Guid TeamMemberId { get; init; }
    public DateTimeOffset VotedAt { get; init; }
}
