namespace TeamManager.Api.Domain.Entities;

public class GameThreesSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string? Title { get; set; }
    public string Status { get; set; } = "inprogress"; // inprogress | completed
    public Guid CreatedByMemberId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public TeamMember? CreatedBy { get; set; }
    public ICollection<GameThreesParticipant> Participants { get; set; } = [];
}
