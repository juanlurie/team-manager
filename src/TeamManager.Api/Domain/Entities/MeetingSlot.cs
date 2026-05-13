using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Domain.Entities;

public class MeetingSlot
{
    public Guid Id { get; set; }
    public Guid MeetingSessionId { get; set; }
    public Guid? TeamMemberId { get; set; }
    public string? Notes { get; set; }
    public SlotType Type { get; set; }
    public DateTimeOffset? BookedAt { get; set; }

    public MeetingSession MeetingSession { get; set; } = null!;
    public TeamMember? TeamMember { get; set; }
}
