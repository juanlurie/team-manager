using TeamManager.Api.Application.DTOs.MeetingSeriesItem;
using TeamManager.Api.Application.DTOs.MeetingSeriesItemParticipant;
using TeamManager.Api.Application.DTOs.MeetingSeriesItemAvailability;

namespace TeamManager.Api.Application.DTOs.MeetingSeries;

public record MeetingSeriesDto
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public Guid CreatedByMemberId { get; init; }
    public string? CreatedByMemberName { get; init; }
    public bool IsActive { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    
    public List<MeetingSeriesSlotDto> Slots { get; init; } = [];
    public List<MeetingSeriesItemDto> Items { get; init; } = [];
}