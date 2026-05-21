namespace TeamManager.Api.Application.DTOs.CoffeeRun;

public record CoffeeRunOrderDto
{
    public Guid Id { get; init; }
    public Guid TeamMemberId { get; init; }
    public string TeamMemberName { get; init; } = string.Empty;
    public string? Notes { get; init; }
    public List<CoffeeRunOrderItemDto> Items { get; init; } = [];
    public decimal Total { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}
