namespace TeamManager.Api.Application.DTOs.Timesheet;

public record TimesheetEntryDto(
    Guid Id,
    Guid TeamMemberId,
    DateOnly Date,
    string Project,
    string Category,
    int Hours,
    int Minutes,
    bool Billable,
    string WorkedFrom,
    string Sentiment,
    string? Description,
    string? TicketNumber,
    DateTimeOffset CreatedAt,
    string? ExternalId = null
);
