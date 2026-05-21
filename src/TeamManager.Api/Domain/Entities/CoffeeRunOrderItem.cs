namespace TeamManager.Api.Domain.Entities;

public class CoffeeRunOrderItem
{
    public Guid Id { get; set; }
    public Guid CoffeeRunOrderId { get; set; }
    public Guid CoffeeRunMenuItemId { get; set; }
    public int Quantity { get; set; }

    public CoffeeRunOrder Order { get; set; } = null!;
    public CoffeeRunMenuItem MenuItem { get; set; } = null!;
}
