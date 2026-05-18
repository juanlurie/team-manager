using System.ComponentModel.DataAnnotations;
using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Application.DTOs.Milestone;

public record UpdateMilestoneRequest(
    [MaxLength(255)] string? Title,
    [MaxLength(4000)] string? Description,
    DateOnly? TargetDate,
    MilestoneStatus? Status,
    int? Position
);
