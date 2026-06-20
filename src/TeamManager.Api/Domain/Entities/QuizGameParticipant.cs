namespace TeamManager.Api.Domain.Entities;

public class QuizGameParticipant
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public Guid MemberId { get; set; }
    public int Score { get; set; }
    public DateTimeOffset JoinedAt { get; set; } = DateTimeOffset.UtcNow;

    public QuizGameSession? Session { get; set; }
    public TeamMember? Member { get; set; }
}
