using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Domain.Entities;

public class Feature
{
    public Guid Id { get; set; }
    public Guid SprintId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ExternalTicketRef { get; set; }
    public WorkItemStatus Status { get; set; } = WorkItemStatus.Planned;

    public bool IsActive { get; set; } = true;
    public decimal? EstimatedDays { get; set; }
    public bool IsUnplanned { get; set; } = false;
    public DateOnly? StartDate { get; set; }

    public Sprint Sprint { get; set; } = null!;
    public ICollection<WorkItem> WorkItems { get; set; } = [];
}
