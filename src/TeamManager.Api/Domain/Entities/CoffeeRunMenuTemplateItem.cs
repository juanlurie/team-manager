namespace TeamManager.Api.Domain.Entities;

public class CoffeeRunMenuTemplateItem
{
    public Guid Id { get; set; }
    public Guid TemplateId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal? Price { get; set; }

    public CoffeeRunMenuTemplate Template { get; set; } = null!;
}
