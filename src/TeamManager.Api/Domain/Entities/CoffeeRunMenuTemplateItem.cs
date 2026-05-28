namespace TeamManager.Api.Domain.Entities;

public class CoffeeRunMenuTemplateItem
{
    public Guid Id { get; set; }
    public Guid TemplateId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal? Price { get; set; }
    public string? Category { get; set; }
    public int SortOrder { get; set; }

    /// <summary>
    /// JSON array of size options, e.g. [{"name":"Small","priceAdjust":0},{"name":"Large","priceAdjust":5}]
    /// </summary>
    public string? Sizes { get; set; }

    /// <summary>
    /// JSON array of addition categories, e.g. [{"name":"Milk","options":["Whole","Oat","Almond"]},{"name":"Syrup","options":["Vanilla","Caramel"]}]
    /// </summary>
    public string? Additions { get; set; }

    public CoffeeRunMenuTemplate Template { get; set; } = null!;
}
