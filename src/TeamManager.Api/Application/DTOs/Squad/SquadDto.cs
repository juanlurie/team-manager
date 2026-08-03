namespace TeamManager.Api.Application.DTOs.Squad;

public record SquadSummaryDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Color { get; init; }
    public Guid? TeamId { get; init; }
    public string? TeamName { get; init; }
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
    public Guid? TeamId { get; init; }
    public string? TeamName { get; init; }
    public IReadOnlyList<SquadMemberEntryDto> Members { get; init; } = [];
}

public record CreateSquadRequest
{
    public string Name { get; init; } = string.Empty;
    public string? Color { get; init; }
    public Guid? TeamId { get; init; }
}

/// <summary>
/// Deliberately carries no TeamId. Update used to share CreateSquadRequest and wrote TeamId
/// unconditionally, so any caller that merely omitted the field silently detached the squad from
/// its team -- a plain rename un-teaming a squad. Team membership moves through
/// <see cref="SetSquadTeamRequest"/> instead, where a null means "detach" because that is the
/// endpoint's only job. Dropping the field is what stops the trap coming back.
/// </summary>
public record UpdateSquadRequest
{
    public string Name { get; init; } = string.Empty;
    public string? Color { get; init; }
}

/// <summary>Null TeamId detaches the squad from its team. Squad.TeamId is optional by design.</summary>
public record SetSquadTeamRequest
{
    public Guid? TeamId { get; init; }
}

public record SetSquadMembersRequest
{
    public List<Guid> MemberIds { get; init; } = [];
}

public record SetMemberSquadsRequest
{
    public List<Guid> SquadIds { get; init; } = [];
}
