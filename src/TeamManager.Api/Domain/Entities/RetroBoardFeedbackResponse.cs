namespace TeamManager.Api.Domain.Entities;

/// <summary>One member's rating of a feedback prompt (1-5 stars) plus an optional comment.
/// Unique per (prompt, member). Stored per-member so a participant can edit their own response,
/// but the facilitator only ever sees the anonymous aggregate.</summary>
public class RetroBoardFeedbackResponse
{
    public Guid Id { get; set; }
    public Guid RetroBoardFeedbackPromptId { get; set; }
    public Guid MemberId { get; set; }

    /// <summary>Star rating, 1-5.</summary>
    public int Score { get; set; }
    public string? Comment { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public RetroBoardFeedbackPrompt? Prompt { get; set; }
    public TeamMember? Member { get; set; }
}
