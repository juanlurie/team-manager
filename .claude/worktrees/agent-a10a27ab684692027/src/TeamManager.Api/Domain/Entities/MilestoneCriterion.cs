namespace TeamManager.Api.Domain.Entities;

public class MilestoneCriterion
{
    public Guid Id { get; set; }
    public Guid MilestoneId { get; set; }
    public string Label { get; set; } = string.Empty;
    public bool Completed { get; set; }
    public int Position { get; set; }

    public Milestone Milestone { get; set; } = null!;
}
