using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.Sprint;

public record CloneSprintRequest(
    [Required][MaxLength(100)] string Name,
    [Required] DateOnly StartDate,
    [Required] DateOnly EndDate,
    bool CopyMembers = true
);
