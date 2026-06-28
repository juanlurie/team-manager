namespace TeamManager.Api.Domain.Entities;

public class DotsAndBoxesSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string? Title { get; set; }
    public string Status { get; set; } = "waiting"; // waiting | inprogress | completed
    public int GridSize { get; set; } = 4;
    public string LinesJson { get; set; } = "[]";
    public string BoxesJson { get; set; } = "{}";
    public Guid? CurrentParticipantId { get; set; }
    public Guid CreatedByMemberId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public TeamMember? CreatedBy { get; set; }
    public DotsAndBoxesParticipant? CurrentParticipant { get; set; }
    public ICollection<DotsAndBoxesParticipant> Participants { get; set; } = [];
}
