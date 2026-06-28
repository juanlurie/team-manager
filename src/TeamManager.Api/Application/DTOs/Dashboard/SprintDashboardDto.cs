using TeamManager.Api.Application.DTOs.Feature;
using TeamManager.Api.Application.DTOs.Sprint;

namespace TeamManager.Api.Application.DTOs.Dashboard;

public record SprintDashboardDto
{
    public SprintDto Sprint { get; init; } = null!;
    public IReadOnlyList<FeatureDto> Features { get; init; } = [];
    public IReadOnlyList<MemberSprintCardDto> Members { get; init; } = [];
}
