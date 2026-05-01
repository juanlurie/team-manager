using TeamManager.Api.Application.DTOs.DiscussionPoint;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface IDiscussionPointService
{
    Task<IReadOnlyList<DiscussionPointDto>> GetAllAsync();
    Task<DiscussionPointDto> CreateAsync(CreateDiscussionPointRequest request);
    Task<DiscussionPointDto?> UpdateAsync(Guid id, CreateDiscussionPointRequest request);
    Task<bool> DeleteAsync(Guid id);
}
