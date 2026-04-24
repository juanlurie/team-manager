namespace TeamManager.Api.Domain.Entities;

public class SprintMember
{
    public Guid Id { get; set; }
    public Guid SprintId { get; set; }
    public Guid TeamMemberId { get; set; }
    public string? Notes { get; set; }

    public Sprint Sprint { get; set; } = null!;
    public TeamMember TeamMember { get; set; } = null!;
    public ICollection<WorkItem> WorkItems { get; set; } = [];
}
