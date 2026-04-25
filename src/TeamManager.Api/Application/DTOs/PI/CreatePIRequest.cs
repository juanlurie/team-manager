using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.PI;

public record CreatePIRequest(
    [Required][MaxLength(100)] string Name,
    [Required] DateOnly StartDate,
    [Required] DateOnly EndDate,
    [MaxLength(500)] string? Description
);
