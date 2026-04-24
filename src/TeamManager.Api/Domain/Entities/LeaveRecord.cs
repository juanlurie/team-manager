using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Domain.Entities;

public class LeaveRecord
{
    public Guid Id { get; set; }
    public Guid TeamMemberId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public LeaveType Type { get; set; }
    public decimal DaysCount { get; set; }
    public string? Notes { get; set; }

    public TeamMember TeamMember { get; set; } = null!;
}
