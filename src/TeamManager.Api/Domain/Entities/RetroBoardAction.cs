namespace TeamManager.Api.Domain.Entities;

/// <summary>An action item produced during Discuss (or suggested by AI in Reflect). Unresolved
/// actions seed the next session's check-in questions (see RetroBoardCheckinQuestion.SourceActionId).</summary>
public class RetroBoardAction
{
    public Guid Id { get; set; }
    public Guid RetroBoardSessionId { get; set; }
    /// <summary>The note this action came out of, if any.</summary>
    public Guid? SourceNoteId { get; set; }

    public string Title { get; set; } = string.Empty;
    public Guid? OwnerMemberId { get; set; }
    /// <summary>JSON array of TeamMember ids assigned to this action (multi-assignee).</summary>
    public string? AssigneeMemberIdsJson { get; set; }
    /// <summary>open|inprogress|done</summary>
    public string Status { get; set; } = "open";
    public DateOnly? DueDate { get; set; }
    public bool IsAiSuggested { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public RetroBoardSession? Session { get; set; }
    public RetroBoardNote? SourceNote { get; set; }
    public TeamMember? Owner { get; set; }
}
