namespace TeamManager.Api.Application.DTOs.Leaderboard;

public record HiScoreEntryDto(
    int Rank,
    Guid MemberId,
    string DisplayName,
    long Score,
    DateTimeOffset? AchievedAt,
    string? AvatarSeed = null
);

public record HiScoreGameDto(
    string Key,
    string Label,
    string Unit,
    bool HigherIsBetter,
    IReadOnlyList<HiScoreEntryDto> Entries
);
