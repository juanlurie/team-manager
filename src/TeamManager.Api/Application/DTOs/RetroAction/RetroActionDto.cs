namespace TeamManager.Api.Application.DTOs.RetroAction;

public record RetroActionDto
{
    public Guid Id { get; init; }
    public Guid SprintId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Notes { get; init; }
    public string? AssignedTo { get; init; }
    public string Status { get; init; } = "Open";
    public DateOnly? DueDate { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}
