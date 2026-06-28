using TeamManager.Api.Application.DTOs.Timesheet;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface ITimesheetApprovalService
{
    Task<TimesheetApprovalFetchResultDto> FetchOutstandingAsync(FetchTimesheetApprovalsRequest request);
    Task<TimesheetQualityAnalysisDto> AnalyzeQualityAsync(AnalyzeApprovalQualityRequest request);
}
