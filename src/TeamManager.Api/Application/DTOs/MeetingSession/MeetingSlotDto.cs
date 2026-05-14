namespace TeamManager.Api.Application.DTOs.MeetingSession;

public record MeetingSlotDto
{
    public Guid Id { get; init; }
    public Guid MeetingSessionId { get; init; }
    public Guid? TeamMemberId { get; init; }
    public string? TeamMemberName { get; init; }
    public Guid? LocationId { get; init; }
    public string? LocationName { get; init; }
    public string? LocationColor { get; init; }
    public string? Notes { get; init; }
    public string SlotType { get; init; } = string.Empty;
    public string? Date { get; init; }
    public string? StartTime { get; init; }
    public string? EndTime { get; init; }
    public DateTimeOffset? BookedAt { get; init; }
}
