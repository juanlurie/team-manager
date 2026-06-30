namespace TeamManager.Api.Application.DTOs.CoffeeRun;

public record CoffeeRunListDto
{
    public Guid Id { get; init; }
    public string InitiatorName { get; init; } = string.Empty;
    public string? Title { get; init; }
    public string Status { get; init; } = string.Empty;
    public int MenuItemCount { get; init; }
    public int OrderCount { get; init; }
    public decimal TotalAmount { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? OrderDeadline { get; init; }
    public DateTimeOffset? ClosedAt { get; init; }
    public string? Location { get; init; }
}
