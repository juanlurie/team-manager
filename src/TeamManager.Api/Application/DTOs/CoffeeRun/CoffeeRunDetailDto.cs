namespace TeamManager.Api.Application.DTOs.CoffeeRun;

public record CoffeeRunDetailDto
{
    public Guid Id { get; init; }
    public Guid InitiatorId { get; init; }
    public string InitiatorName { get; init; } = string.Empty;
    public string? Title { get; init; }
    public string? Description { get; init; }
    public string? Location { get; init; }
    public string Status { get; init; } = string.Empty;
    public Guid? CurrentUserOrderId { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? OrderDeadline { get; init; }
    public DateTimeOffset? ClosedAt { get; init; }
    public DateTimeOffset? CancelledAt { get; init; }
    public List<CoffeeRunMenuItemDto> MenuItems { get; init; } = [];
    public List<CoffeeRunOrderDto> Orders { get; init; } = [];
}
