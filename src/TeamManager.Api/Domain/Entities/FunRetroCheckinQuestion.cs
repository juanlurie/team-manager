namespace TeamManager.Api.Domain.Entities;

/// <summary>
/// A check-in prompt shown during the optional "check-in" phase of a FunRetro (ported from
/// RetroBoard). Typically carried forward from the creator's previous retro's action items so
/// the team can rate whether each one got better/same/worse since last time.
/// </summary>
public class FunRetroCheckinQuestion
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public string Text { get; set; } = "";
    public string? ContextText { get; set; }
    /// <summary>The action-column card this question was seeded from, if carried forward.</summary>
    public Guid? SourceCardId { get; set; }
    public int SortOrder { get; set; }

    public FunRetroSession Session { get; set; } = null!;
    public ICollection<FunRetroCheckinResponse> Responses { get; set; } = [];
}
