using TeamManager.Api.Application.DTOs.RetroAction;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface IRetroActionService
{
    Task<IReadOnlyList<RetroActionDto>> GetBySprintAsync(Guid sprintId);
    Task<IReadOnlyList<RetroActionDto>> GetPreviousBySprintAsync(Guid currentSprintId);
    Task<RetroActionDto> CreateAsync(CreateRetroActionRequest request);
    Task<RetroActionDto?> UpdateAsync(Guid id, CreateRetroActionRequest request);
    Task<bool> DeleteAsync(Guid id);
}
