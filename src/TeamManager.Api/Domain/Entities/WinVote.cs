namespace TeamManager.Api.Domain.Entities;

public class WinVote
{
    public Guid Id { get; set; }
    public Guid WinNominationId { get; set; }
    public Guid? TeamMemberId { get; set; }
    public string? GuestSessionId { get; set; }
    public DateTimeOffset VotedAt { get; set; } = DateTimeOffset.UtcNow;

    public WinNomination WinNomination { get; set; } = null!;
    public TeamMember? TeamMember { get; set; }
}
