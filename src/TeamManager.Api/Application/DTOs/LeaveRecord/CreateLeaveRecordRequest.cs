using System.ComponentModel.DataAnnotations;
using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Application.DTOs.LeaveRecord;

public record CreateLeaveRecordRequest(
    [Required] Guid TeamMemberId,
    [Required] DateOnly StartDate,
    [Required] DateOnly EndDate,
    [Required] LeaveType Type,
    [Required][Range(0.5, 365.0)] decimal DaysCount,
    [MaxLength(500)] string? Notes
);
