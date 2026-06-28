using TeamManager.Api.Application.DTOs.Timesheet;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface ITimesheetService
{
    Task<IReadOnlyList<TimesheetEntryDto>> GetByMonthAsync(Guid memberId, int year, int month);
    Task<TimesheetEntryDto> CreateAsync(Guid memberId, CreateTimesheetEntryRequest req);
    Task<TimesheetEntryDto?> UpdateAsync(Guid memberId, Guid entryId, UpdateTimesheetEntryRequest req);
    Task<bool> DeleteAsync(Guid memberId, Guid entryId);
    Task<byte[]> ExportMonthAsync(Guid memberId, int year, int month);
    Task<int> EnqueueSyncAsync(Guid memberId, Guid[] entryIds);
    Task<TimesheetQualityAnalysisDto> AnalyzeQualityAsync(Guid memberId, int lookbackDays);
}
