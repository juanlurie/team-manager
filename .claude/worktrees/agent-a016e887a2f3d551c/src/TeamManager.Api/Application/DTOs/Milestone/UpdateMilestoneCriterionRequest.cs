using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.Milestone;

public record UpdateMilestoneCriterionRequest(
    [MaxLength(500)] string? Label,
    bool? Completed,
    int? Position
);
