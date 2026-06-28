namespace TeamManager.Api.Domain.Entities;

public class WinMonthNomination
{
    public Guid Id { get; set; }
    public Guid WinMonthId { get; set; }
    public Guid SourceWinWeekId { get; set; }
    public Guid NomineeMemberId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int VoteCount { get; set; }

    public WinMonth WinMonth { get; set; } = null!;
    public WinWeek SourceWinWeek { get; set; } = null!;
    public TeamMember Nominee { get; set; } = null!;
    public ICollection<WinMonthVote> Votes { get; set; } = [];
}
