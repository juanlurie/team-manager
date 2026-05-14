namespace TeamManager.Api.Application.DTOs.Leaderboard;

public record PointHistoryEntryDto
{
    public Guid Id { get; init; }
    public string Source { get; init; } = string.Empty;
    public string Label { get; init; } = string.Empty;
    public int Points { get; init; }
    public string Reason { get; init; } = string.Empty;
    public DateTimeOffset AwardedAt { get; init; }
}
