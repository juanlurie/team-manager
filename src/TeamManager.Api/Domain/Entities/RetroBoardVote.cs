namespace TeamManager.Api.Domain.Entities;

/// <summary>A single vote a member or guest spends on a note. Multiple rows per voter/note are
/// allowed up to the per-note cap; a voter's total is bounded by session.VotesPerUser.
/// Exactly one of <see cref="MemberId"/> / <see cref="GuestSessionId"/> identifies the voter.</summary>
public class RetroBoardVote
{
    public Guid Id { get; set; }
    public Guid RetroBoardNoteId { get; set; }

    /// <summary>The voting member, or null when a guest cast it.</summary>
    public Guid? MemberId { get; set; }

    /// <summary>The voting guest's server-issued session id, or null when a member cast it.</summary>
    public string? GuestSessionId { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public RetroBoardNote? Note { get; set; }
    public TeamMember? Member { get; set; }
}
