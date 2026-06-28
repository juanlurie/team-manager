using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.Timesheet;

public record CreateTimesheetEntryRequest(
    [Required] DateOnly Date,
    [Required][MaxLength(100)] string Project,
    [Required][MaxLength(200)] string Category,
    [Range(0, 23)] int Hours,
    [Range(0, 59)] int Minutes,
    bool Billable,
    [Required][MaxLength(20)] string WorkedFrom,
    [Required][MaxLength(10)] string Sentiment,
    [MaxLength(1000)] string? Description,
    [MaxLength(100)] string? TicketNumber
);
