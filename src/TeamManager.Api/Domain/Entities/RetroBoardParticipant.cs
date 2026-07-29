namespace TeamManager.Api.Domain.Entities;

/// <summary>Someone who has joined a session (via slug or team). Persisted so the roster and
/// attendance survive disconnects -- live "who's online" presence stays in the WebSocket layer.
///
/// A participant is either a <b>member</b> (<see cref="MemberId"/> set, resolved from the auth
/// token) or a <b>guest</b> (<see cref="MemberId"/> null; <see cref="DisplayName"/> +
/// <see cref="GuestSessionId"/> carry a session-scoped identity). Guest join is gated by
/// <see cref="RetroBoardSession.AllowGuestJoin"/>. See docs/session-identity.md.</summary>
public class RetroBoardParticipant
{
    public Guid Id { get; set; }
    public Guid RetroBoardSessionId { get; set; }

    /// <summary>The joined member, or null for a guest (someone with no member record for this
    /// session's team). Exactly one of MemberId / GuestSessionId identifies a participant.</summary>
    public Guid? MemberId { get; set; }

    /// <summary>Guest's chosen display name. Null for members (their name comes from the profile).</summary>
    public string? DisplayName { get; set; }

    /// <summary>Stable session-scoped token for a guest, so rejoining recognizes the same person
    /// instead of duplicating them. Null for members. Server-issued, never client-chosen.</summary>
    public string? GuestSessionId { get; set; }

    /// <summary>facilitator|participant. The creator is a facilitator and may promote others.</summary>
    public string Role { get; set; } = "participant";

    /// <summary>Set when a facilitator removed this participant from the retro. The row is kept
    /// rather than deleted so the removal sticks: a guest still holding their session cookie (and a
    /// member who still has the board link) is refused on rejoin instead of silently reappearing.
    /// A removed participant is treated as not enrolled by every guard, drops off the roster, and
    /// has their votes revoked at removal time. A facilitator can clear this to re-admit them.</summary>
    public DateTimeOffset? RemovedAt { get; set; }

    public DateTimeOffset JoinedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset LastSeenAt { get; set; } = DateTimeOffset.UtcNow;

    public RetroBoardSession? Session { get; set; }
    public TeamMember? Member { get; set; }
}
