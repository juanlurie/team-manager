namespace TeamManager.Api.Application.DTOs.MeetingSession;

public record MeetingSlotDto
{
    public Guid Id { get; init; }
    public Guid MeetingSessionId { get; init; }
    public Guid? TeamMemberId { get; init; }
    public string? TeamMemberName { get; init; }
    public string? Notes { get; init; }
    public string SlotType { get; init; } = string.Empty;
    public DateTimeOffset? BookedAt { get; init; }
}
