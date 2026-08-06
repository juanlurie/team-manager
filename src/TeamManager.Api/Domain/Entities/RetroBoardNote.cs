namespace TeamManager.Api.Domain.Entities;

/// <summary>A note/card captured during the Capture phase.</summary>
public class RetroBoardNote
{
    public Guid Id { get; set; }
    public Guid RetroBoardSessionId { get; set; }
    public Guid RetroBoardColumnId { get; set; }

    /// <summary>Authoring member, or null when the note is anonymous OR was posted by a guest
    /// (see <see cref="AuthorGuestSessionId"/>).</summary>
    public Guid? AuthorMemberId { get; set; }

    /// <summary>Authoring guest's server-issued session id, or null when a member posted it (or it's
    /// anonymous). At most one of AuthorMemberId / AuthorGuestSessionId is set.</summary>
    public string? AuthorGuestSessionId { get; set; }

    public bool IsAnonymous { get; set; }
    public string Text { get; set; } = string.Empty;

    /// <summary>Flagged during the Introduce read stage as needing the owner to explain it.</summary>
    public bool Flagged { get; set; }
    /// <summary>Optional one-line context added by the author/facilitator.</summary>
    public string? Clarification { get; set; }
    /// <summary>Set when the note was introduced in the spotlight (owner presented it).</summary>
    public DateTimeOffset? IntroducedAt { get; set; }

    /// <summary>Groups near-duplicate notes into one topic so the team votes on the idea rather than
    /// splitting its vote across three wordings of it. Null when the note stands alone; otherwise the
    /// id of the group's <b>anchor</b> note, which points at itself (<c>GroupId == Id</c>). Modelled
    /// exactly like <see cref="FunRetroCard.GroupId"/> so both retro surfaces behave the same.
    ///
    /// A group always lives inside one column — the columns are the themes, and merging across them
    /// would erase the distinction they exist to draw.</summary>
    public Guid? GroupId { get; set; }

    /// <summary>What the group is about. Only meaningful on the anchor; set by the AI grouper or
    /// edited by the facilitator, and cleared when the group dissolves.</summary>
    public string? GroupLabel { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public RetroBoardSession? Session { get; set; }
    public RetroBoardColumn? Column { get; set; }
    public TeamMember? Author { get; set; }
    public ICollection<RetroBoardVote> Votes { get; set; } = [];
    public ICollection<RetroBoardNoteComment> Comments { get; set; } = [];
}
