namespace TeamManager.Api.Application.DTOs.Sprint;

public record CreateSprintRequest(
    string Name,
    DateOnly StartDate,
    DateOnly EndDate,
    Guid? PIId,
    int? SprintNumber,
    bool IsInnovationSprint = false
);
