namespace TeamManager.Api.Application.DTOs.SessionDefinition;

public record SessionDefinitionParticipantDto
{
    public Guid Id { get; init; }
    public Guid TeamMemberId { get; init; }
    public string? TeamMemberName { get; init; }
    public string Role { get; init; } = string.Empty;
}
