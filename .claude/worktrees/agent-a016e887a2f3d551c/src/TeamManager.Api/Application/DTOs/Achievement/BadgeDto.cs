namespace TeamManager.Api.Application.DTOs.Achievement;

public record BadgeDto
{
    public Guid Id { get; init; }
    public string Icon { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Category { get; init; } = string.Empty;
}
