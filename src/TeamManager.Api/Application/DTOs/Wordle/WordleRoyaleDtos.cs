namespace TeamManager.Api.Application.DTOs.Wordle;

public record RoyaleStandingDto
{
    public int Rank { get; init; }
    public Guid MemberId { get; init; }
    public string MemberName { get; init; } = string.Empty;
    public int Elo { get; init; }
    public int WinStreak { get; init; }
    public int BestStreak { get; init; }
    public int Wins { get; init; }
    public int Losses { get; init; }
    public int Draws { get; init; }
}

public record RoyaleMatchDto
{
    public Guid Id { get; init; }
    public Guid SessionId { get; init; }
    public Guid Player1Id { get; init; }
    public string Player1Name { get; init; } = string.Empty;
    public Guid Player2Id { get; init; }
    public string Player2Name { get; init; } = string.Empty;
    public Guid? WinnerId { get; init; }
    public int Player1Guesses { get; init; }
    public int Player2Guesses { get; init; }
    public bool Player1Won { get; init; }
    public bool Player2Won { get; init; }
    public int Player1EloChange { get; init; }
    public int Player2EloChange { get; init; }
    public int Player1EloAfter { get; init; }
    public int Player2EloAfter { get; init; }
    public DateTimeOffset PlayedAt { get; init; }
}

public record WeeklyRoyaleDto
{
    public int IsoWeek { get; init; }
    public int Year { get; init; }
    public List<RoyaleMatchDto> Matches { get; init; } = [];
}

public record MyRoyaleResultDto
{
    public int EloChange { get; init; }
    public int EloAfter { get; init; }
    public int WinStreak { get; init; }
    public int MatchesWon { get; init; }
    public int MatchesLost { get; init; }
    public int MatchesDrawn { get; init; }
}
