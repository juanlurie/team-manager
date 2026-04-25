using TeamManager.Api.Application.DTOs.WorkItem;
using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface IWorkItemService
{
    Task<IReadOnlyList<WorkItemDto>> GetBySprintMemberAsync(Guid sprintMemberId);
    Task<WorkItemDto?> GetByIdAsync(Guid id);
    Task<WorkItemDto> CreateAsync(Guid sprintMemberId, CreateWorkItemRequest request);
    Task<WorkItemDto?> UpdateAsync(Guid id, CreateWorkItemRequest request);
    Task<WorkItemDto?> UpdateStatusAsync(Guid id, WorkItemStatus status);
    Task<bool> DeleteAsync(Guid id);
    Task<WorkItemDto?> CarryOverAsync(Guid workItemId, Guid targetSprintId);
}
