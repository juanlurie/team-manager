using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Application.DTOs.Feature;

public record CreateFeatureRequest(
    string Title,
    string? Description,
    string? ExternalTicketRef,
    WorkItemStatus Status,
    decimal? EstimatedDays = null,
    bool IsUnplanned = false,
    DateOnly? StartDate = null
);
