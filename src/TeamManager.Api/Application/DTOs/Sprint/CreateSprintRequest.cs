namespace TeamManager.Api.Application.DTOs.Sprint;

public record CreateSprintRequest(
    string Name,
    DateOnly StartDate,
    DateOnly EndDate,
    Guid? PiId,
    int? SprintNumber,
    bool IsInnovationSprint = false,
    string? Goal = null
);
