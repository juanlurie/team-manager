namespace TeamManager.Api.Application.DTOs.Leaderboard;

public record PointBreakdownItem(string Source, string Label, int Points, int Count);

public record LeaderboardEntryDto
{
    public int Position { get; init; }
    public Guid MemberId { get; init; }
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
    public string? AvatarSeed { get; init; }
    public int TotalPoints { get; init; }
    public int BadgePoints { get; init; }
    public int SprintPoints { get; init; }
    public int BonusPoints { get; init; }
    public IReadOnlyList<PointBreakdownItem> Breakdown { get; init; } = [];
}
