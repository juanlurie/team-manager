using System.ComponentModel.DataAnnotations;
using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Application.DTOs.Feature;

public record CreateFeatureRequest(
    [Required][MaxLength(200)] string Title,
    [MaxLength(2000)] string? Description,
    [MaxLength(50)] string? ExternalTicketRef,
    [Required] WorkItemStatus Status,
    [Range(0.5, 999.0)] decimal? EstimatedDays = null,
    bool IsUnplanned = false,
    DateOnly? StartDate = null
);
