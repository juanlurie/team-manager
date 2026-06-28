using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.Sprint;

public record UpdateRetroRequest(
    [MaxLength(5000)] string? WentWell,
    [MaxLength(5000)] string? DidntGoWell,
    [MaxLength(5000)] string? ActionItems
);
