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
    public FunRetroSession Session { get; set; } = null!;
    public TeamMember Author { get; set; } = null!;
    public ICollection<FunRetroVote> Votes { get; set; } = [];
    public ICollection<FunRetroReaction> Reactions { get; set; } = [];
}
