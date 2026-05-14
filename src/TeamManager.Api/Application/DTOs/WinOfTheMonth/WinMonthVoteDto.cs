namespace TeamManager.Api.Application.DTOs.WinOfTheMonth;

public record WinMonthVoteDto
{
    public Guid Id { get; init; }
    public Guid WinMonthNominationId { get; init; }
    public Guid TeamMemberId { get; init; }
    public DateTimeOffset VotedAt { get; init; }
}
