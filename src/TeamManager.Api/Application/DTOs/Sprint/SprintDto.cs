namespace TeamManager.Api.Application.DTOs.Sprint;

public record SprintDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public DateOnly StartDate { get; init; }
    public DateOnly EndDate { get; init; }
    public Guid? PIId { get; init; }
    public string? PIName { get; init; }
    public int? SprintNumber { get; init; }
    public bool IsInnovationSprint { get; init; }
}
