namespace TeamManager.Api.Domain.Entities;

public class ScrumPokerSession
{
    public Guid Id { get; set; }
    public Guid CreatedByMemberId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? StoryTitle { get; set; }
    public string? Description { get; set; }
    public string Scale { get; set; } = "Fibonacci";
    public bool Revealed { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? RevealedAt { get; set; }
    public DateTimeOffset? ResetAt { get; set; }

    public TeamMember CreatedByMember { get; set; } = null!;
    public ICollection<ScrumPokerVote> Votes { get; set; } = new List<ScrumPokerVote>();
}
