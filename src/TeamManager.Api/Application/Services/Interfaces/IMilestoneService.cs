using TeamManager.Api.Application.DTOs.Milestone;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface IMilestoneService
{
    Task<IReadOnlyList<MilestoneDto>> GetByPIAsync(Guid piId);
    Task<MilestoneDetailDto?> GetByIdAsync(Guid id);
    Task<MilestoneDto> CreateAsync(Guid piId, CreateMilestoneRequest request);
    Task<MilestoneDto?> UpdateAsync(Guid id, UpdateMilestoneRequest request);
    Task<bool> DeleteAsync(Guid id);

    Task<IReadOnlyList<MilestoneCriterionDto>> GetCriteriaAsync(Guid milestoneId);
    Task<MilestoneCriterionDto> AddCriterionAsync(Guid milestoneId, CreateMilestoneCriterionRequest request);
    Task<MilestoneCriterionDto?> UpdateCriterionAsync(Guid criterionId, UpdateMilestoneCriterionRequest request);
    Task<bool> DeleteCriterionAsync(Guid criterionId);
}
