using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Application.DTOs.LeaveRecord;

public record CreateLeaveRecordRequest(
    Guid TeamMemberId,
    DateOnly StartDate,
    DateOnly EndDate,
    LeaveType Type,
    decimal DaysCount,
    string? Notes
);
