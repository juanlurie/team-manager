namespace TeamManager.Api.Application.DTOs.Dashboard;

public record DashboardLeaveSummaryDto
{
    public int MembersOnLeaveToday { get; init; }
    public int MembersOnLeaveTotal { get; init; }
    public decimal TotalWorkingDays { get; init; }
    public decimal TotalCalendarDays { get; init; }
    public List<LeaveTypeSummaryDto> ByType { get; init; } = [];
    public List<MemberLeaveDetailDto> Members { get; init; } = [];
}

public record LeaveTypeSummaryDto
{
    public string Type { get; init; } = string.Empty;
    public int RecordCount { get; init; }
    public decimal WorkingDays { get; init; }
    public decimal CalendarDays { get; init; }
}

public record MemberLeaveDetailDto
{
    public Guid TeamMemberId { get; init; }
    public string MemberName { get; init; } = string.Empty;
    public int RecordCount { get; init; }
    public decimal TotalWorkingDays { get; init; }
    public decimal TotalCalendarDays { get; init; }
    public List<DetailedLeaveRecordDto> Records { get; init; } = [];
}

public record DetailedLeaveRecordDto
{
    public Guid Id { get; init; }
    public string Type { get; init; } = string.Empty;
    public DateOnly StartDate { get; init; }
    public DateOnly EndDate { get; init; }
    public decimal WorkingDays { get; init; }
    public decimal CalendarDays { get; init; }
    public string? Notes { get; init; }
}
