namespace TeamManager.Api.Domain.Entities;

public class Poll
{
    public Guid Id { get; set; }
    public string Question { get; set; } = string.Empty;
    public Guid CreatedByMemberId { get; set; }
    public bool IsClosed { get; set; }
    public bool HideResultsUntilClosed { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ClosedAt { get; set; }
    public DateTimeOffset? ScheduledCloseAt { get; set; }

    public Guid? RetroSessionId { get; set; }

    public TeamMember? CreatedByMember { get; set; }
    public FunRetroSession? RetroSession { get; set; }
    public ICollection<PollOption> Options { get; set; } = [];
    public ICollection<PollVote> Votes { get; set; } = [];
}
