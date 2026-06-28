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

    /// <summary>
    /// JSON array of size options, e.g. [{"name":"Small","priceAdjust":0},{"name":"Large","priceAdjust":5}]
    /// </summary>
    public string? Sizes { get; set; }

    /// <summary>
    /// JSON array of addition categories, e.g. [{"name":"Milk","options":["Whole","Oat","Almond"]},{"name":"Syrup","options":["Vanilla","Caramel"]}]
    /// </summary>
    public string? Additions { get; set; }

    public CoffeeRun CoffeeRun { get; set; } = null!;
    public ICollection<CoffeeRunOrderItem> OrderItems { get; set; } = new List<CoffeeRunOrderItem>();
}
