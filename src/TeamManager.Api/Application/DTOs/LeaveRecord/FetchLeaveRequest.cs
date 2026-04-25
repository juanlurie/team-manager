using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.LeaveRecord;

public record FetchLeaveRequest(
    [Required][MaxLength(2000)] string Cookie,
    [Required][MinLength(1)] IReadOnlyList<int> TeamIds,
    [Required][MaxLength(10)] string Start,
    [Required][MaxLength(10)] string End
);
