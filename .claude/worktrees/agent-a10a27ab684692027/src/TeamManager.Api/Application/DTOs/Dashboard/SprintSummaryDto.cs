namespace TeamManager.Api.Application.DTOs.Dashboard;

public record SprintSummaryDto
{
    public int TotalMembers { get; init; }
    public int PlannedCount { get; init; }
    public int InProgressCount { get; init; }
    public int BlockedCount { get; init; }
    public int CompletedCount { get; init; }
    public decimal TotalLeaveDays { get; init; }
}
