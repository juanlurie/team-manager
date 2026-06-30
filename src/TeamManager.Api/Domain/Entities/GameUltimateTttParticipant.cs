namespace TeamManager.Api.Domain.Entities;

public class GameUltimateTttParticipant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SessionId { get; set; }
    public Guid? MemberId { get; set; }  // null for AI
    public string DisplayName { get; set; } = "";
    public int Order { get; set; }  // 0 = X, 1 = O
    public int Score { get; set; }  // small boards won
    public bool IsWinner { get; set; }
    public bool IsAi { get; set; }
    public GameUltimateTttSession? Session { get; set; }
    public TeamMember? Member { get; set; }
}
