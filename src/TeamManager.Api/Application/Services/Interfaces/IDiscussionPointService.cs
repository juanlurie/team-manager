using TeamManager.Api.Application.DTOs.DiscussionPoint;
using TeamManager.Api.Application.DTOs.DiscussionTask;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface IDiscussionPointService
{
    Task<IReadOnlyList<DiscussionPointDto>> GetAllAsync();
    Task<DiscussionPointDto> CreateAsync(CreateDiscussionPointRequest request);
    Task<DiscussionPointDto?> UpdateAsync(Guid id, CreateDiscussionPointRequest request);
    Task<bool> DeleteAsync(Guid id);
    
    // Task methods
    Task<IReadOnlyList<DiscussionTaskDto>> GetTasksAsync(Guid discussionPointId);
    Task<DiscussionTaskDto> CreateTaskAsync(Guid discussionPointId, CreateDiscussionTaskRequest request);
    Task<DiscussionTaskDto?> UpdateTaskAsync(Guid discussionPointId, Guid taskId, CreateDiscussionTaskRequest request);
    Task<bool> DeleteTaskAsync(Guid discussionPointId, Guid taskId);
    Task<DiscussionTaskDto?> ToggleTaskAsync(Guid discussionPointId, Guid taskId);
}
