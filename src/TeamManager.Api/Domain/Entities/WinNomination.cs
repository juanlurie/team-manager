namespace TeamManager.Api.Domain.Entities;

public class WinNomination
{
    public Guid Id { get; set; }
    public Guid WinWeekId { get; set; }
    public Guid? TeamMemberId { get; set; }         // submitter; null for guest nominations
    public string? GuestName { get; set; }           // guest display name when TeamMemberId is null
    public string? GuestSessionId { get; set; }      // per-browser session token for guest rate-limiting
    public Guid NomineeMemberId { get; set; }       // nominated person
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public WinWeek WinWeek { get; set; } = null!;
    public TeamMember? TeamMember { get; set; }   // submitter; null for guest nominations
    public TeamMember Nominee { get; set; } = null!;       // nominated
    public ICollection<WinVote> Votes { get; set; } = [];
}
