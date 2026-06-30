namespace TeamManager.Api.Application.DTOs.MeetingSeries;

public record BulkAvailabilityResponse
{
    public Guid SeriesId { get; init; }
    public Guid MemberId { get; init; }
    public string MemberName { get; init; } = string.Empty;
    public List<BulkAvailabilityItemDto> Items { get; init; } = [];
    public List<BulkAvailabilitySlotDto> Slots { get; init; } = [];
}

public record BulkAvailabilityItemDto
{
    public Guid ItemId { get; init; }
    public string ItemTitle { get; init; } = string.Empty;
    public bool IsConfirmed { get; init; }
    public List<Guid> AvailableSlotIds { get; init; } = [];
}

public record BulkAvailabilitySlotDto
{
    public Guid SlotId { get; init; }
    public DateOnly Date { get; init; }
    public TimeSpan StartTime { get; init; }
    public TimeSpan EndTime { get; init; }
    public Guid? LocationId { get; init; }
    public string? LocationName { get; init; }
    public string? LocationColor { get; init; }
    public bool IsClaimed { get; init; }
    public Guid? ClaimedByItemId { get; init; }
}
