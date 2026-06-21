namespace TeamManager.Api.Domain.Entities;

public class PollVote
{
    public Guid Id { get; set; }
    public Guid PollId { get; set; }
    public Guid PollOptionId { get; set; }
    public Guid MemberId { get; set; }
    public DateTimeOffset VotedAt { get; set; } = DateTimeOffset.UtcNow;

    public Poll? Poll { get; set; }
    public PollOption? Option { get; set; }
}
