using System;
using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Domain.Entities;

public class MeetingSeriesItem
{
    public Guid Id { get; set; }
    public Guid MeetingSeriesId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? DurationMinutes { get; set; }
    public Guid? ConfirmedSlotId { get; set; }
    public bool IsConfirmed { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation properties
    public MeetingSeries MeetingSeries { get; set; } = null!;
    public MeetingSeriesSlot? ConfirmedSlot { get; set; }
    public ICollection<MeetingSeriesItemParticipant> Participants { get; set; } = [];
    public ICollection<MeetingSeriesItemAvailability> Availabilities { get; set; } = [];
}