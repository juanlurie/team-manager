namespace TeamManager.Api.Application.DTOs.CoffeeRun;

public record CoffeeRunOrderItemDto
{
    public Guid Id { get; init; }
    public Guid MenuItemId { get; init; }
    public string MenuItemName { get; init; } = string.Empty;
    public decimal UnitPrice { get; init; }
    public int Quantity { get; init; }
    public decimal LineTotal { get; init; }
    public string? SelectedSize { get; init; }
    public string? SelectedAdditions { get; init; }
}
