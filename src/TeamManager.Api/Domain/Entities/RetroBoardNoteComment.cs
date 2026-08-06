namespace TeamManager.Api.Domain.Entities;

/// <summary>A threaded comment on a note — the "add context without adding another sticky" affordance.
/// Authored by a member or a guest (exactly one of <see cref="AuthorMemberId"/> /
/// <see cref="AuthorGuestSessionId"/> is set), mirroring how <see cref="RetroBoardNote"/> and
/// <see cref="RetroBoardVote"/> carry the two identities. Comments are never anonymous: their whole
/// point is knowing who is asking for clarification.</summary>
public class RetroBoardNoteComment
{
    public Guid Id { get; set; }
    public Guid RetroBoardNoteId { get; set; }

    /// <summary>Authoring member, or null when a guest wrote it.</summary>
    public Guid? AuthorMemberId { get; set; }

    /// <summary>Authoring guest's server-issued session id, or null when a member wrote it.</summary>
    public string? AuthorGuestSessionId { get; set; }

    /// <summary>Guest's display name captured at write time, so the comment still reads correctly if
    /// the guest's participant row is later removed. Null for members (name comes from the profile).</summary>
    public string? AuthorDisplayName { get; set; }

    public string Text { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public RetroBoardNote? Note { get; set; }
    public TeamMember? Author { get; set; }
}
