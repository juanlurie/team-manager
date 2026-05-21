using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Domain.Entities;

public class CoffeeRun
{
    public Guid Id { get; set; }
    public Guid InitiatorId { get; set; }
    public CoffeeRunStatus Status { get; set; } = CoffeeRunStatus.Open;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ClosedAt { get; set; }

    public TeamMember Initiator { get; set; } = null!;
    public ICollection<CoffeeRunMenuItem> MenuItems { get; set; } = new List<CoffeeRunMenuItem>();
    public ICollection<CoffeeRunOrder> Orders { get; set; } = new List<CoffeeRunOrder>();
}
