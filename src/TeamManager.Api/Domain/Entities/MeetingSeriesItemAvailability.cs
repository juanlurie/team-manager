using System;

namespace TeamManager.Api.Domain.Entities;

public class MeetingSeriesItemAvailability
{
    public Guid Id { get; set; }
    public Guid MeetingSeriesItemId { get; set; }
    public Guid MeetingSeriesSlotId { get; set; }
    public Guid TeamMemberId { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation properties
    public MeetingSeriesItem MeetingSeriesItem { get; set; } = null!;
    public MeetingSeriesSlot MeetingSeriesSlot { get; set; } = null!;
    public TeamMember TeamMember { get; set; } = null!;
}