namespace TeamManager.Api.Application.DTOs.Squad;

public record SquadSummaryDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Color { get; init; }
}

public record SquadMemberEntryDto
{
    public Guid TeamMemberId { get; init; }
    public string FullName { get; init; } = string.Empty;
}

public record SquadDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Color { get; init; }
    public IReadOnlyList<SquadMemberEntryDto> Members { get; init; } = [];
}

public record CreateSquadRequest
{
    public string Name { get; init; } = string.Empty;
    public string? Color { get; init; }
}

public record SetSquadMembersRequest
{
    public List<Guid> MemberIds { get; init; } = [];
}

public record SetMemberSquadsRequest
{
    public List<Guid> SquadIds { get; init; } = [];
}
