namespace TeamManager.Api.Application.DTOs.SessionDefinition;

public record SessionDefinitionBookingDto
{
    public Guid Id { get; init; }
    public Guid SessionDefinitionSlotId { get; init; }
    public Guid TeamMemberId { get; init; }
    public string? TeamMemberName { get; init; }
    public string? Notes { get; init; }
    public DateTimeOffset BookedAt { get; init; }
}
