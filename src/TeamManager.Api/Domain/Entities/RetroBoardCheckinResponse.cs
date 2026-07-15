namespace TeamManager.Api.Domain.Entities;

/// <summary>One member's rating of a check-in question. Unique per (question, member).</summary>
public class RetroBoardCheckinResponse
{
    public Guid Id { get; set; }
    public Guid RetroBoardCheckinQuestionId { get; set; }
    public Guid MemberId { get; set; }

    /// <summary>better|same|worse|na</summary>
    public string Rating { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public RetroBoardCheckinQuestion? Question { get; set; }
    public TeamMember? Member { get; set; }
}
