namespace TeamManager.Api.Domain.Entities;

public class CoffeeRunMenuItem
{
    public Guid Id { get; set; }
    public Guid CoffeeRunId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string? Category { get; set; }
    public int? MaxQuantity { get; set; }
    public bool IsAvailable { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public CoffeeRun CoffeeRun { get; set; } = null!;
    public ICollection<CoffeeRunOrderItem> OrderItems { get; set; } = new List<CoffeeRunOrderItem>();
}
