namespace TeamManager.Api.Application.DTOs.Milestone;

public record MilestoneCriterionDto
{
    public Guid Id { get; init; }
    public Guid MilestoneId { get; init; }
    public string Label { get; init; } = string.Empty;
    public bool Completed { get; init; }
    public int Position { get; init; }
}

public record MilestoneDto
{
    public Guid Id { get; init; }
    public Guid PIId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateOnly? TargetDate { get; init; }
    public string Status { get; init; } = string.Empty;
    public string Scope { get; init; } = string.Empty;
    public Guid? SquadId { get; init; }
    public string? SquadName { get; init; }
    public string? SquadColor { get; init; }
    public int Position { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }

    public int TaskCount { get; init; }
    public int CompletedTaskCount { get; init; }
    public decimal ProgressPercent { get; init; }
    public int CriteriaCount { get; init; }
    public int CompletedCriteriaCount { get; init; }
}

public record MilestoneRoadmapDto
{
    public Guid PIId { get; init; }
    public string PIName { get; init; } = string.Empty;
    public int TotalMilestones { get; init; }
    public int CompletedMilestones { get; init; }
    public int InProgressMilestones { get; init; }
    public int UpcomingMilestones { get; init; }
    public decimal OverallProgressPercent { get; init; }
    public IReadOnlyList<MilestoneRoadmapItemDto> Milestones { get; init; } = [];
}

public record MilestoneRoadmapItemDto
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Scope { get; init; } = string.Empty;
    public string? SquadName { get; init; }
    public string? SquadColor { get; init; }
    public string Status { get; init; } = string.Empty;
    public DateOnly? TargetDate { get; init; }
    public decimal ProgressPercent { get; init; }
    public int DaysUntilTarget { get; init; }
    public int CriteriaTotal { get; init; }
    public int CriteriaCompleted { get; init; }
}

public record MilestoneDetailDto : MilestoneDto
{
    public IReadOnlyList<MilestoneCriterionDto> Criteria { get; init; } = [];
    public IReadOnlyList<MilestoneWorkItemDto> Tasks { get; init; } = [];
    public IReadOnlyList<MilestoneSprintDto> Sprints { get; init; } = [];
}

public record MilestoneWorkItemDto
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public string Type { get; init; } = string.Empty;
    public string Assignee { get; init; } = string.Empty;
    public Guid SprintMemberId { get; init; }
    public string SprintName { get; init; } = string.Empty;
    public Guid SprintId { get; init; }
}

public record MilestoneSprintDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
}
