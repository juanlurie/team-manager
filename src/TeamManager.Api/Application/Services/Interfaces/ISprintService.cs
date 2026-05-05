using TeamManager.Api.Application.DTOs.Sprint;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface ISprintService
{
    Task<IReadOnlyList<SprintDto>> GetAllAsync(Guid? piId, DateOnly? from, DateOnly? to);
    Task<SprintDto?> GetByIdAsync(Guid id);
    Task<SprintDto> CreateAsync(CreateSprintRequest request);
    Task<SprintDto?> UpdateAsync(Guid id, CreateSprintRequest request);
    Task<bool> DeleteAsync(Guid id);
    Task<int> InitializeMembersAsync(Guid sprintId);
    Task<SprintDto?> UpdateRetroAsync(Guid id, UpdateRetroRequest request);
    Task<SprintDto?> CloneAsync(Guid sourceId, CloneSprintRequest request);
    Task<SprintDto?> CloseAsync(Guid id);
    Task<IReadOnlyList<VelocityEntryDto>> GetVelocityAsync(Guid? piId);
}
