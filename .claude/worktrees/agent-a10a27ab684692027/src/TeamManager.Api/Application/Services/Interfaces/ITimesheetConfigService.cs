using TeamManager.Api.Application.DTOs.Timesheet;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface ITimesheetConfigService
{
    Task<TimesheetConfigDto> GetAsync(Guid memberId);
    Task<TimesheetConfigDto> UpsertAsync(Guid memberId, UpsertTimesheetConfigRequest request);
}
