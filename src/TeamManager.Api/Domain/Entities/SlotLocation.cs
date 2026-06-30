namespace TeamManager.Api.Domain.Entities;

public class SlotLocation
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "#64b5f6";
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }

    public ICollection<MeetingSlot> Slots { get; set; } = [];
}
