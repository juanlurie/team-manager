using TeamManager.Api.Application.DTOs.Timesheet;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface ITimesheetApprovalService
{
    Task<IReadOnlyList<TimesheetApprovalMemberDto>> FetchOutstandingAsync(FetchTimesheetApprovalsRequest request);
}
