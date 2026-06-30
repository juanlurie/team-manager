namespace TeamManager.Api.Domain.Entities;

public class WinMonthVote
{
    public Guid Id { get; set; }
    public Guid WinMonthNominationId { get; set; }
    public Guid TeamMemberId { get; set; }
    public DateTimeOffset VotedAt { get; set; } = DateTimeOffset.UtcNow;

    public WinMonthNomination Nomination { get; set; } = null!;
    public TeamMember TeamMember { get; set; } = null!;
}
