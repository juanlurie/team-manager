using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Domain.Entities;

public class SessionDefinitionParticipant
{
    public Guid Id { get; set; }
    public Guid SessionDefinitionId { get; set; }
    public Guid TeamMemberId { get; set; }
    public ParticipantRole Role { get; set; }

    public SessionDefinition SessionDefinition { get; set; } = null!;
    public TeamMember TeamMember { get; set; } = null!;
}
