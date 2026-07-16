namespace TeamManager.Api.Domain.Entities;

/// <summary>A logged-in member who has joined a session (via slug or team). Persisted so the
/// roster and attendance survive disconnects -- live "who's online" presence stays in the
/// WebSocket layer.</summary>
public class RetroBoardParticipant
{
    public Guid Id { get; set; }
    public Guid RetroBoardSessionId { get; set; }
    public Guid MemberId { get; set; }

    /// <summary>facilitator|participant. The creator is a facilitator and may promote others.</summary>
    public string Role { get; set; } = "participant";

    public DateTimeOffset JoinedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset LastSeenAt { get; set; } = DateTimeOffset.UtcNow;

    public RetroBoardSession? Session { get; set; }
    public TeamMember? Member { get; set; }
}
