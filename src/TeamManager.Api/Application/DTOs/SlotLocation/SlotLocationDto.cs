namespace TeamManager.Api.Application.DTOs.SlotLocation;

public record SlotLocationDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Color { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public int SortOrder { get; init; }
}
