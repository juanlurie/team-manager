namespace TeamManager.Api.Domain.Entities;

public class WinNomination
{
    public Guid Id { get; set; }
    public Guid WinWeekId { get; set; }
    public Guid TeamMemberId { get; set; }         // submitter
    public Guid NomineeMemberId { get; set; }       // nominated person
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public WinWeek WinWeek { get; set; } = null!;
    public TeamMember TeamMember { get; set; } = null!;   // submitter
    public TeamMember Nominee { get; set; } = null!;       // nominated
    public ICollection<WinVote> Votes { get; set; } = [];
}
