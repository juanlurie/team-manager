using TeamManager.Api.Application.DTOs.Timesheet;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface ITimesheetApprovalFetcher
{
    Task<IReadOnlyList<ImportedTimesheetEntry>> FetchAsync(FetchTimesheetApprovalsRequest request);
}
