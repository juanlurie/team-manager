namespace TeamManager.Api.Domain.Entities;

/// <summary>A logged-in member who has joined a session (via slug or team). Persisted so the
/// roster, attendance, and async/self-paced completion survive disconnects -- live "who's
/// online" presence stays in the WebSocket layer.</summary>
public class RetroBoardParticipant
{
    public Guid Id { get; set; }
    public Guid RetroBoardSessionId { get; set; }
    public Guid MemberId { get; set; }

    /// <summary>facilitator|participant. The creator is a facilitator and may promote others.</summary>
    public string Role { get; set; } = "participant";
    /// <summary>Working ahead of the live flow. Server only honours this while Phase == "setup".</summary>
    public bool IsSelfPaced { get; set; }

    public DateTimeOffset JoinedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset LastSeenAt { get; set; } = DateTimeOffset.UtcNow;

    public RetroBoardSession? Session { get; set; }
    public TeamMember? Member { get; set; }
    public ICollection<RetroBoardParticipantProgress> Progress { get; set; } = [];
}
