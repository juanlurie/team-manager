namespace TeamManager.Api.Domain.Entities;

// One match record per ordered pair (player1Id < player2Id by guid) within a completed session.
// A session with N finishers produces N*(N-1)/2 match records.
public class WordleRoyaleMatch
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public Guid Player1Id { get; set; }
    public Guid Player2Id { get; set; }
    public Guid? WinnerId { get; set; }
    public int Player1Guesses { get; set; }
    public int Player2Guesses { get; set; }
    public bool Player1Won { get; set; }
    public bool Player2Won { get; set; }
    public int Player1EloChange { get; set; }
    public int Player2EloChange { get; set; }
    public int Player1EloAfter { get; set; }
    public int Player2EloAfter { get; set; }
    public int IsoWeek { get; set; }
    public int Year { get; set; }
    public DateTimeOffset PlayedAt { get; set; } = DateTimeOffset.UtcNow;

    public WordleSession? Session { get; set; }
    public TeamMember? Player1 { get; set; }
    public TeamMember? Player2 { get; set; }
}
