namespace TeamManager.Api.Domain.Entities;

public class SessionDefinitionBooking
{
    public Guid Id { get; set; }
    public Guid SessionDefinitionSlotId { get; set; }
    public Guid TeamMemberId { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset BookedAt { get; set; } = DateTimeOffset.UtcNow;

    public SessionDefinitionSlot Slot { get; set; } = null!;
    public TeamMember TeamMember { get; set; } = null!;
}
