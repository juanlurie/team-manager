namespace TeamManager.Api.Domain.Entities;

public enum WordleParticipantStatus
{
    Playing,
    Won,
    Lost
}

public class WordleParticipant
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public Guid MemberId { get; set; }
    public WordleParticipantStatus Status { get; set; } = WordleParticipantStatus.Playing;
    public int GuessCount { get; set; }
    public DateTimeOffset JoinedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? FinishedAt { get; set; }

    public WordleSession? Session { get; set; }
    public TeamMember? Member { get; set; }
}
