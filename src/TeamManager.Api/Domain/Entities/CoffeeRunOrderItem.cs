namespace TeamManager.Api.Domain.Entities;

public class CoffeeRunOrderItem
{
    public Guid Id { get; set; }
    public Guid CoffeeRunOrderId { get; set; }
    public Guid CoffeeRunMenuItemId { get; set; }
    public int Quantity { get; set; }

    /// <summary>
    /// Price snapshot at time of order. Always set by CoffeeRunService during order creation/update.
    /// </summary>
    public decimal UnitPrice { get; set; }

    /// <summary>
    /// Computed as UnitPrice * Quantity. Always set by CoffeeRunService during order creation/update.
    /// </summary>
    public decimal LineTotal { get; set; }

    public CoffeeRunOrder Order { get; set; } = null!;
    public CoffeeRunMenuItem MenuItem { get; set; } = null!;
}
