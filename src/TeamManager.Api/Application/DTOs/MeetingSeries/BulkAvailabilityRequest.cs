namespace TeamManager.Api.Application.DTOs.MeetingSeries;

public record BulkAvailabilityRequest
{
    public List<BulkAvailabilityEntry> Availabilities { get; init; } = [];
}

public record BulkAvailabilityEntry
{
    public Guid ItemId { get; init; }
    public Guid SlotId { get; init; }
}
