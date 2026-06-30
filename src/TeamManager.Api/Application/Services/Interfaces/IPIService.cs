using TeamManager.Api.Application.DTOs.PI;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface IPIService
{
    Task<IReadOnlyList<PIDto>> GetAllAsync();
    Task<PIDto?> GetByIdAsync(Guid id);
    Task<PIDto> CreateAsync(CreatePIRequest request);
    Task<PIDto?> UpdateAsync(Guid id, CreatePIRequest request);
    Task<bool> DeleteAsync(Guid id);
}
