using TeamManager.Api.Application.DTOs.WorkItem;
using TeamManager.Api.Application.DTOs.LeaveRecord;

namespace TeamManager.Api.Application.DTOs.Dashboard;

public record MemberSprintCardDto
{
    public Guid SprintMemberId { get; init; }
    public Guid TeamMemberId { get; init; }
    public string FullName { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
    public string? TeamLeadName { get; init; }
    public List<string> Crafts { get; init; } = [];
    public string? Notes { get; init; }
    public int? Capacity { get; init; }
    public IReadOnlyList<WorkItemDto> WorkItems { get; init; } = [];
    public IReadOnlyList<LeaveRecordDto> LeaveRecords { get; init; } = [];
    public IReadOnlyList<string> SquadNames { get; init; } = [];
}
