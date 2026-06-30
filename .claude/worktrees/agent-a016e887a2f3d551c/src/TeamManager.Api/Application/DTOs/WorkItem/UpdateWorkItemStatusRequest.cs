using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Application.DTOs.WorkItem;

public record UpdateWorkItemStatusRequest(WorkItemStatus Status);
