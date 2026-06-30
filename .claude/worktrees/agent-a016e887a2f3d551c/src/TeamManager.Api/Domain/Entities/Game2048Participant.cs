namespace TeamManager.Api.Domain.Entities;

public class Game2048Participant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SessionId { get; set; }
    public Guid MemberId { get; set; }
    public string DisplayName { get; set; } = "";
    public int Order { get; set; }
    public int Score { get; set; }
    public string BoardJson { get; set; } = "[]"; // 16 ints
    public bool IsGameOver { get; set; }
    public bool HasWon { get; set; }

    public Game2048Session? Session { get; set; }
    public TeamMember? Member { get; set; }
}
