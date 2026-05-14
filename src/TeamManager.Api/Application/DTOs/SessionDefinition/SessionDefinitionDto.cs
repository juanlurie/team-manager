namespace TeamManager.Api.Application.DTOs.SessionDefinition;

public record SessionDefinitionDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public Guid CreatedByMemberId { get; init; }
    public string? CreatedByMemberName { get; init; }
    public bool IsActive { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public List<SessionDefinitionParticipantDto> Participants { get; init; } = [];
    public List<SessionDefinitionSlotDto> Slots { get; init; } = [];
}
