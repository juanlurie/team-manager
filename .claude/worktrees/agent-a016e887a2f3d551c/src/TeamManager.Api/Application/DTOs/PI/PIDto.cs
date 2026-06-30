namespace TeamManager.Api.Application.DTOs.PI;

public record PIDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public DateOnly StartDate { get; init; }
    public DateOnly EndDate { get; init; }
    public string? Description { get; init; }
}
