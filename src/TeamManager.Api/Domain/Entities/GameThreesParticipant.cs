namespace TeamManager.Api.Domain.Entities;

public class GameThreesParticipant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SessionId { get; set; }
    public Guid MemberId { get; set; }
    public string DisplayName { get; set; } = "";
    public int Order { get; set; }
    public int Score { get; set; }
    public string BoardJson { get; set; } = "[]"; // 16 ints
    public int NextTile { get; set; } = 1;         // upcoming tile value (1, 2 or 3)
    public bool IsGameOver { get; set; }
    public GameThreesSession? Session { get; set; }
    public TeamMember? Member { get; set; }
}
