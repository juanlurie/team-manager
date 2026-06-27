namespace TeamManager.Api.Domain.Entities;

public class WordleRoyaleRating
{
    public Guid MemberId { get; set; }
    public int Elo { get; set; } = 1200;
    public int WinStreak { get; set; } = 0;
    public int BestStreak { get; set; } = 0;
    public int Wins { get; set; } = 0;
    public int Losses { get; set; } = 0;
    public int Draws { get; set; } = 0;
    public DateTimeOffset LastUpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public TeamMember? Member { get; set; }
}
