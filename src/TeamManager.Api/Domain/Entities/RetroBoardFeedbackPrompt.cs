namespace TeamManager.Api.Domain.Entities;

/// <summary>A post-retro feedback prompt (e.g. "Presentation", "Flow", "Collaboration") defined by
/// the facilitator in Setup. After the session closes, participants rate each prompt 1-5 and may
/// leave a free-text comment; the facilitator sees the anonymous aggregate.</summary>
public class RetroBoardFeedbackPrompt
{
    public Guid Id { get; set; }
    public Guid RetroBoardSessionId { get; set; }

    public string Text { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    public RetroBoardSession? Session { get; set; }
    public ICollection<RetroBoardFeedbackResponse> Responses { get; set; } = [];
}
