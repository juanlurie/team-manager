using TeamManager.Api.Application.DTOs.Dashboard;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface IDashboardService
{
    Task<SprintDashboardDto?> GetSprintDashboardAsync(Guid sprintId, Guid? teamLeadId = null);
    Task<SprintSummaryDto?> GetSprintSummaryAsync(Guid sprintId);
    Task<IReadOnlyList<BlockerDto>> GetBlockersAsync(Guid sprintId);
    Task<DashboardLeaveSummaryDto?> GetLeaveSummaryAsync(Guid sprintId);
}
