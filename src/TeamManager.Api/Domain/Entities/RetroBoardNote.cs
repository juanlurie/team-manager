namespace TeamManager.Api.Domain.Entities;

/// <summary>A note/card captured during the Capture phase.</summary>
public class RetroBoardNote
{
    public Guid Id { get; set; }
    public Guid RetroBoardSessionId { get; set; }
    public Guid RetroBoardColumnId { get; set; }

    /// <summary>Author, or null when posted anonymously (AllowAnonymous).</summary>
    public Guid? AuthorMemberId { get; set; }
    public bool IsAnonymous { get; set; }
    public string Text { get; set; } = string.Empty;

    /// <summary>Flagged during the Introduce read stage as needing the owner to explain it.</summary>
    public bool Flagged { get; set; }
    /// <summary>Optional one-line context added by the author/facilitator.</summary>
    public string? Clarification { get; set; }
    /// <summary>Set when the note was introduced in the spotlight (owner presented it).</summary>
    public DateTimeOffset? IntroducedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public RetroBoardSession? Session { get; set; }
    public RetroBoardColumn? Column { get; set; }
    public TeamMember? Author { get; set; }
    public ICollection<RetroBoardVote> Votes { get; set; } = [];
}
