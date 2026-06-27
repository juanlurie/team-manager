namespace TeamManager.Api.Domain.Entities;

public class Game2048Session
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string? Title { get; set; }
    public string Status { get; set; } = "waiting"; // waiting | inprogress | completed
    public Guid CreatedByMemberId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public TeamMember? CreatedBy { get; set; }
    public ICollection<Game2048Participant> Participants { get; set; } = [];
}
