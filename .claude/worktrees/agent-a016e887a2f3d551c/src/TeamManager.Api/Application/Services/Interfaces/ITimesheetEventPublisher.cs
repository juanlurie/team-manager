using TeamManager.Api.Application.DTOs.Timesheet;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface ITimesheetEventPublisher
{
    Task PublishAsync(string eventType, TimesheetEntryDto entry);
}
