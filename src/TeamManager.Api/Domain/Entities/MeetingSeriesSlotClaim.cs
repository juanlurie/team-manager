using System;

namespace TeamManager.Api.Domain.Entities;

public class MeetingSeriesSlotClaim
{
    public Guid Id { get; set; }
    public Guid MeetingSeriesId { get; set; }
    public Guid MeetingSeriesSlotId { get; set; }
    public Guid MeetingSeriesItemId { get; set; }
    public DateTimeOffset ClaimedAt { get; set; } = DateTimeOffset.UtcNow;
    public Guid ClaimedByMemberId { get; set; }

    // Navigation properties
    public MeetingSeries MeetingSeries { get; set; } = null!;
    public MeetingSeriesSlot MeetingSeriesSlot { get; set; } = null!;
    public MeetingSeriesItem MeetingSeriesItem { get; set; } = null!;
    public TeamMember ClaimedByMember { get; set; } = null!;
}
