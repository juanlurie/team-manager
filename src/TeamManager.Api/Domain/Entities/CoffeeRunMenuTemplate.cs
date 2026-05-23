namespace TeamManager.Api.Domain.Entities;

public class CoffeeRunMenuTemplate
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid CreatedByMemberId { get; set; }
    public string Scope { get; set; } = "Personal";
    public bool IsArchived { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public TeamMember CreatedBy { get; set; } = null!;
    public ICollection<CoffeeRunMenuTemplateItem> Items { get; set; } = new List<CoffeeRunMenuTemplateItem>();
}
