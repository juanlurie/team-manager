namespace TeamManager.Api.Application.DTOs.WorkItem;

public record WorkItemDto
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string Type { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public Guid SprintMemberId { get; init; }
    public Guid? FeatureId { get; init; }
    public string? FeatureTitle { get; init; }
    public string? ExternalTicketRef { get; init; }
    public decimal? EstimatedPoints { get; init; }
    public decimal? ActualPoints { get; init; }
    public DateOnly? CompletedDate { get; init; }
    public DateTimeOffset? BlockedAt { get; init; }
    public string? BlockedReason { get; init; }
    public int CommentCount { get; init; }
}
