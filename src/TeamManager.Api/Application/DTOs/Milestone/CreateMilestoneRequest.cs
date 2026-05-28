using System.ComponentModel.DataAnnotations;
using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Application.DTOs.Milestone;

public record CreateMilestoneRequest(
    [Required][MaxLength(255)] string Title,
    [MaxLength(4000)] string? Description,
    DateOnly? TargetDate,
    MilestoneStatus Status = MilestoneStatus.Upcoming,
    int Position = 0,
    MilestoneScope Scope = MilestoneScope.Global,
    Guid? SquadId = null
);
