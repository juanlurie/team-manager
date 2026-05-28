namespace TeamManager.Api.Domain.Entities;

public class ScrumPokerVote
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public Guid MemberId { get; set; }
    public string? Value { get; set; }
    public DateTimeOffset VotedAt { get; set; } = DateTimeOffset.UtcNow;

    public ScrumPokerSession Session { get; set; } = null!;
    public TeamMember Member { get; set; } = null!;
}
