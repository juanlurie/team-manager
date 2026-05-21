namespace TeamManager.Api.Application.DTOs.CoffeeRun;

public record CoffeeRunListDto
{
    public Guid Id { get; init; }
    public string InitiatorName { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public int MenuItemCount { get; init; }
    public int OrderCount { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? ClosedAt { get; init; }
}
