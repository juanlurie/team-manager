namespace TeamManager.Api.Domain.Entities;

/// <summary>One participant's rating of a feedback prompt (1-5 stars) plus an optional comment.
/// Unique per (prompt, responder). Stored per-responder so they can edit their own response, but the
/// facilitator only ever sees the anonymous aggregate. Exactly one of <see cref="MemberId"/> /
/// <see cref="GuestSessionId"/> identifies the responder (member or guest), mirroring the note/vote
/// entities.</summary>
public class RetroBoardFeedbackResponse
{
    public Guid Id { get; set; }
    public Guid RetroBoardFeedbackPromptId { get; set; }

    /// <summary>The responding member, or null when a guest submitted it.</summary>
    public Guid? MemberId { get; set; }

    /// <summary>The responding guest's server-issued session id, or null when a member submitted it.</summary>
    public string? GuestSessionId { get; set; }

    /// <summary>Star rating, 1-5.</summary>
    public int Score { get; set; }
    public string? Comment { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public RetroBoardFeedbackPrompt? Prompt { get; set; }
    public TeamMember? Member { get; set; }
}
