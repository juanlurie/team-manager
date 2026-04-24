namespace TeamManager.Api.Application.DTOs.LeaveRecord;

public record LeaveRecordDto
{
    public Guid Id { get; init; }
    public Guid TeamMemberId { get; init; }
    public string MemberName { get; init; } = string.Empty;
    public DateOnly StartDate { get; init; }
    public DateOnly EndDate { get; init; }
    public string Type { get; init; } = string.Empty;
    public decimal DaysCount { get; init; }
    public string? Notes { get; init; }
}
