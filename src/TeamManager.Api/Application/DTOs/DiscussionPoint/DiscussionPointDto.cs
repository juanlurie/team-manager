namespace TeamManager.Api.Application.DTOs.DiscussionPoint;

public record DiscussionPointDto
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Notes { get; init; }
    public string Status { get; init; } = string.Empty;
    public string Priority { get; init; } = string.Empty;
    public Guid? SprintId { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}
