namespace TeamManager.Api.Domain.Entities;

public class GameUltimateTttSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string? Title { get; set; }
    public string Status { get; set; } = "waiting"; // waiting | inprogress | completed
    public Guid CreatedByMemberId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string CellsJson { get; set; } = "[]";    // int[81]: 0=empty 1=X 2=O
    public string BigBoardJson { get; set; } = "[]"; // int[9]:  0=empty 1=X 2=O 3=draw
    public Guid? CurrentTurnMemberId { get; set; }
    public int NextBoardIndex { get; set; } = -1;    // -1=free choice, 0-8=required board
    public Guid? WinnerMemberId { get; set; }
    public bool IsAiGame { get; set; }
    public TeamMember? CreatedBy { get; set; }
    public ICollection<GameUltimateTttParticipant> Participants { get; set; } = [];
}
