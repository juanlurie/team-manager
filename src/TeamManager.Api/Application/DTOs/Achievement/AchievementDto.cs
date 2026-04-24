namespace TeamManager.Api.Application.DTOs.Achievement;

public record AchievementDto
{
    public Guid Id { get; init; }
    public string Key { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string Icon { get; init; } = string.Empty;
    public string Category { get; init; } = string.Empty;
    public int Points { get; init; }
}
