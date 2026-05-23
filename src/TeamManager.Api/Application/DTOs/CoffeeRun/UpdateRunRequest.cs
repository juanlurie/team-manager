using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.CoffeeRun;

public record UpdateRunRequest(
    [MaxLength(200)] string? Title,
    [MaxLength(1000)] string? Description,
    [MaxLength(200)] string? Location,
    DateTimeOffset? OrderDeadline
);
