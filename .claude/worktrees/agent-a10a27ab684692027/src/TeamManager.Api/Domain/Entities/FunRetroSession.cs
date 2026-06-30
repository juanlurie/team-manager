namespace TeamManager.Api.Domain.Entities;

public class FunRetroSession
{
    public Guid Id { get; set; }
    public string? Title { get; set; }
    public string Phase { get; set; } = "lobby"; // lobby|add|vote|discuss|done
    public Guid CreatedByMemberId { get; set; }
    public Guid? SprintId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public TeamMember? CreatedBy { get; set; }
    public Sprint? Sprint { get; set; }
    public ICollection<FunRetroCard> Cards { get; set; } = [];
    public string? AiAnalysisJson { get; set; }
}
