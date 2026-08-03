namespace TeamManager.Api.Application.DTOs.Team;

public record TeamSummaryDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
}

public record TeamSquadEntryDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Color { get; init; }
}

public record TeamDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public IReadOnlyList<TeamSquadEntryDto> Squads { get; init; } = [];
}

public record CreateTeamRequest
{
    public string Name { get; init; } = string.Empty;
}
