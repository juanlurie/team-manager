using TeamManager.Api.Application.DTOs.Feature;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface IFeatureService
{
    Task<IReadOnlyList<FeatureDto>> GetAllAsync(string? status = null, Guid? piId = null);
    Task<IReadOnlyList<FeatureDto>> GetBySprintAsync(Guid sprintId);
    Task<FeatureDto> CreateAsync(Guid sprintId, CreateFeatureRequest request);
    Task<FeatureDto?> UpdateAsync(Guid id, CreateFeatureRequest request);
    Task<bool> DeleteAsync(Guid id);
    Task<FeatureDto?> ToggleActiveAsync(Guid id);
    Task<FeatureDto?> SetStatusAsync(Guid id, string status);
}
