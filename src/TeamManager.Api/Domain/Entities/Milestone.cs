using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Domain.Entities;

public class Milestone
{
    public Guid Id { get; set; }
    public Guid PIId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly? TargetDate { get; set; }
    public MilestoneStatus Status { get; set; } = MilestoneStatus.Upcoming;
    public MilestoneScope Scope { get; set; } = MilestoneScope.Global;
    public Guid? SquadId { get; set; }
    public int Position { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public PI PI { get; set; } = null!;
    public Squad? Squad { get; set; }
    public ICollection<MilestoneCriterion> Criteria { get; set; } = [];
    public ICollection<WorkItem> WorkItems { get; set; } = [];
}
