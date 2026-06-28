using System;
using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Domain.Entities;

public class MeetingSeriesSlot
{
    public Guid Id { get; set; }
    public Guid MeetingSeriesId { get; set; }
    public DateOnly Date { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public Guid? LocationId { get; set; }
    public int SortOrder { get; set; }

    // Navigation properties
    public MeetingSeries MeetingSeries { get; set; } = null!;
    public SlotLocation? Location { get; set; }
    public ICollection<MeetingSeriesItemAvailability> Availabilities { get; set; } = [];
}