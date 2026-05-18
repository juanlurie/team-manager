using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.Milestone;

public record CreateMilestoneCriterionRequest(
    [Required] string Label,
    bool Completed = false,
    int Position = 0
);
