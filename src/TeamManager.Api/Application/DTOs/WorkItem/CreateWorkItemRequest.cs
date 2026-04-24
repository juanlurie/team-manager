using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Application.DTOs.WorkItem;

public record CreateWorkItemRequest(
    string Title,
    string? Description,
    WorkItemType Type,
    WorkItemStatus Status,
    Guid? FeatureId,
    string? ExternalTicketRef,
    decimal? EstimatedPoints,
    decimal? ActualPoints,
    DateOnly? CompletedDate
);
