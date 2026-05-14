using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Domain.Entities;

public class MeetingSession
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly Date { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public MeetingLocation Location { get; set; }
    public MeetingType Type { get; set; }
    public MeetingStatus Status { get; set; } = MeetingStatus.Open;
    public Guid CreatedByMemberId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Guid? SessionDefinitionSlotId { get; set; }
    public Guid? SessionDefinitionId { get; set; }
    public Guid? MeetingSeriesItemId { get; set; }
    public Guid? MeetingSeriesSlotId { get; set; }

    public TeamMember CreatedBy { get; set; } = null!;
    public SessionDefinitionSlot? SessionDefinitionSlot { get; set; }
    public SessionDefinition? SessionDefinition { get; set; }
    public MeetingSeriesItem? MeetingSeriesItem { get; set; }
    public MeetingSeriesSlot? MeetingSeriesSlot { get; set; }
    public ICollection<MeetingSlot> Slots { get; set; } = [];
}
