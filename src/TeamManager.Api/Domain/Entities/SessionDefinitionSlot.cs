namespace TeamManager.Api.Domain.Entities;

public class SessionDefinitionSlot
{
    public Guid Id { get; set; }
    public Guid SessionDefinitionId { get; set; }
    public DateOnly Date { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public Guid? LocationId { get; set; }
    public bool IsConfirmed { get; set; }

    public SessionDefinition SessionDefinition { get; set; } = null!;
    public SlotLocation? Location { get; set; }
    public ICollection<SessionDefinitionBooking> Bookings { get; set; } = [];
}
