namespace TeamManager.Api.Application.DTOs.Dashboard;

public record BlockerDto
{
    public Guid WorkItemId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? FeatureTitle { get; init; }
    public string? ExternalTicketRef { get; init; }
    public Guid MemberId { get; init; }
    public string MemberName { get; init; } = string.Empty;
    public DateTimeOffset BlockedAt { get; init; }
    public int DaysBlocked { get; init; }
}
