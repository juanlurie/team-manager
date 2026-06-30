namespace TeamManager.Api.Application.DTOs.Progress;

public record ProgressFeatureDto
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? ExternalTicketRef { get; init; }
    public string Status { get; init; } = string.Empty;
    public decimal? EstimatedDays { get; init; }
    public bool IsUnplanned { get; init; }
    public DateOnly? StartDate { get; init; }
    public int TotalTasks { get; init; }
    public int CompletedTasks { get; init; }
    public int InProgressTasks { get; init; }
    public int BlockedTasks { get; init; }
}

public record ProgressSprintDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public DateOnly StartDate { get; init; }
    public DateOnly EndDate { get; init; }
    public int? SprintNumber { get; init; }
    public bool IsInnovationSprint { get; init; }
    public IReadOnlyList<ProgressFeatureDto> Features { get; init; } = [];
}

public record ProgressPIDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public DateOnly StartDate { get; init; }
    public DateOnly EndDate { get; init; }
    public IReadOnlyList<ProgressSprintDto> Sprints { get; init; } = [];
}
