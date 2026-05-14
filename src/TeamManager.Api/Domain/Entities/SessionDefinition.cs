namespace TeamManager.Api.Domain.Entities;

public class SessionDefinition
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid CreatedByMemberId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public TeamMember CreatedBy { get; set; } = null!;
    public ICollection<SessionDefinitionParticipant> Participants { get; set; } = [];
    public ICollection<SessionDefinitionSlot> Slots { get; set; } = [];
}
