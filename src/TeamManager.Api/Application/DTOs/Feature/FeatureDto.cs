namespace TeamManager.Api.Application.DTOs.Feature;

public record FeatureTaskDto
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Type { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public string Assignee { get; init; } = string.Empty;
}

public record FeatureDto
{
    public Guid Id { get; init; }
    public Guid SprintId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string? ExternalTicketRef { get; init; }
    public string Status { get; init; } = string.Empty;
    public bool IsActive { get; init; } = true;
    public decimal? EstimatedDays { get; init; }
    public bool IsUnplanned { get; init; }
    public DateOnly? StartDate { get; init; }
    public string? SprintName { get; init; }
    public string? PiName { get; init; }
    public IReadOnlyList<FeatureTaskDto> Tasks { get; init; } = [];
}
