namespace TeamManager.Api.Domain.Entities;

public class FunRetroCard
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public string Column { get; set; } = "well"; // well|better|action
    public string Text { get; set; } = "";
    public Guid AuthorId { get; set; }
    public string AuthorName { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public double? PositionX { get; set; }
    public double? PositionY { get; set; }
    public string? Color { get; set; }
    public Guid? GroupId { get; set; }
    // Only meaningful on the anchor card (Id == GroupId) -- what the group is about. Set by the
    // AI grouper from its suggested cluster label; null for manual drag-to-stack grouping, where
    // there's no label to infer from.
    public string? GroupLabel { get; set; }
    public FunRetroSession Session { get; set; } = null!;
    public TeamMember Author { get; set; } = null!;
    public ICollection<FunRetroVote> Votes { get; set; } = [];
    public ICollection<FunRetroReaction> Reactions { get; set; } = [];
    public ICollection<FunRetroCardComment> Comments { get; set; } = [];
}
