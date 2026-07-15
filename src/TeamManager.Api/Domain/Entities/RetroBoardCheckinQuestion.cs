namespace TeamManager.Api.Domain.Entities;

/// <summary>A check-in statement shown at the start of the retro, rated Better/Same/Worse/N-A.
/// Typically carried forward from the previous retro's unresolved actions.</summary>
public class RetroBoardCheckinQuestion
{
    public Guid Id { get; set; }
    public Guid RetroBoardSessionId { get; set; }

    public string Text { get; set; } = string.Empty;
    /// <summary>Context line, e.g. "Last retro: agreed to automate CI/CD pipeline".</summary>
    public string? ContextText { get; set; }
    /// <summary>The action this question was seeded from, when carried forward.</summary>
    public Guid? SourceActionId { get; set; }
    public int SortOrder { get; set; }

    public RetroBoardSession? Session { get; set; }
    public RetroBoardAction? SourceAction { get; set; }
    public ICollection<RetroBoardCheckinResponse> Responses { get; set; } = [];
}
