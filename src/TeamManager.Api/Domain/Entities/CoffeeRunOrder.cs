using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Domain.Entities;

public class CoffeeRunOrder
{
    public Guid Id { get; set; }
    public Guid CoffeeRunId { get; set; }
    public Guid TeamMemberId { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Placed;
    public string? Notes { get; set; }
    public decimal TotalAmount { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public CoffeeRun CoffeeRun { get; set; } = null!;
    public TeamMember TeamMember { get; set; } = null!;
    public ICollection<CoffeeRunOrderItem> Items { get; set; } = new List<CoffeeRunOrderItem>();
}
