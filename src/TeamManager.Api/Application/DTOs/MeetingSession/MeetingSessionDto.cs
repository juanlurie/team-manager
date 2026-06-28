namespace TeamManager.Api.Application.DTOs.MeetingSession;

public record MeetingSessionDto
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateOnly Date { get; init; }
    public string StartTime { get; init; } = string.Empty;
    public string EndTime { get; init; } = string.Empty;
    public string Location { get; init; } = string.Empty;
    public string Type { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public Guid CreatedByMemberId { get; init; }
    public string? CreatedByMemberName { get; init; }
    public List<MeetingSlotDto> Slots { get; init; } = [];
    public DateTimeOffset CreatedAt { get; init; }
}
