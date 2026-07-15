namespace TeamManager.Api.Domain.Entities;

/// <summary>A single vote a member spends on a note. Multiple rows per (note, member) are
/// allowed up to the per-note cap; a member's total is bounded by session.VotesPerUser.</summary>
public class RetroBoardVote
{
    public Guid Id { get; set; }
    public Guid RetroBoardNoteId { get; set; }
    public Guid MemberId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public RetroBoardNote? Note { get; set; }
    public TeamMember? Member { get; set; }
}
