using TeamManager.Api.Application.DTOs.Achievement;
using TeamManager.Api.Application.DTOs.Squad;

namespace TeamManager.Api.Application.DTOs.TeamMember;

public record TeamMemberDto
{
    public Guid Id { get; init; }
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
    public Guid? TeamLeadId { get; init; }
    public string? TeamLeadName { get; init; }
    public List<string> Crafts { get; init; } = [];
    public bool IsActive { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateOnly? BirthDate { get; init; }
    public DateOnly? JoinDate { get; init; }
    public IReadOnlyList<BadgeDto> Achievements { get; init; } = [];
    public IReadOnlyList<SquadSummaryDto> Squads { get; init; } = [];
}
