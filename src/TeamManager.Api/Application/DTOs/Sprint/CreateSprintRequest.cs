using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.Sprint;

public record CreateSprintRequest(
    [Required][MaxLength(100)] string Name,
    [Required] DateOnly StartDate,
    [Required] DateOnly EndDate,
    Guid? PiId,
    [Range(1, 999)] int? SprintNumber,
    bool IsInnovationSprint = false,
    [MaxLength(500)] string? Goal = null
);
