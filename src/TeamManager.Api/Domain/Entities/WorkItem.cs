using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Domain.Entities;

public class WorkItem
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public WorkItemType Type { get; set; }
    public WorkItemStatus Status { get; set; }
    public Guid SprintMemberId { get; set; }
    public string? ExternalTicketRef { get; set; }
    public decimal? EstimatedPoints { get; set; }
    public decimal? ActualPoints { get; set; }
    public DateOnly? CompletedDate { get; set; }

    public Guid? FeatureId { get; set; }
    public DateTimeOffset? BlockedAt { get; set; }
    public string? BlockedReason { get; set; }

    public Guid? MilestoneId { get; set; }

    public SprintMember SprintMember { get; set; } = null!;
    public Feature? Feature { get; set; }
    public Milestone? Milestone { get; set; }
}
