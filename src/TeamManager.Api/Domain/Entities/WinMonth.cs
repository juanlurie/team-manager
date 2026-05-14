using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Domain.Entities;

public class WinMonth
{
    public Guid Id { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public WinMonthStatus Status { get; set; } = WinMonthStatus.Voting;
    public Guid? WinnerNominationId { get; set; }
    public DateTimeOffset OpenedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ClosedAt { get; set; }
    public DateTimeOffset? VotingEndsAt { get; set; }

    public WinMonthNomination? Winner { get; set; }
    public ICollection<WinMonthNomination> Nominations { get; set; } = [];
}
