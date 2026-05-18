using System.ComponentModel.DataAnnotations;
using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Application.DTOs.WorkItem;

public record CreateWorkItemRequest(
    [Required][MaxLength(200)] string Title,
    [MaxLength(2000)] string? Description,
    [Required] WorkItemType Type,
    [Required] WorkItemStatus Status,
    Guid? FeatureId,
    Guid? MilestoneId,
    [MaxLength(50)] string? ExternalTicketRef,
    [Range(0.0, 9999.0)] decimal? EstimatedPoints,
    [Range(0.0, 9999.0)] decimal? ActualPoints,
    DateOnly? CompletedDate,
    [MaxLength(500)] string? BlockedReason = null
);
