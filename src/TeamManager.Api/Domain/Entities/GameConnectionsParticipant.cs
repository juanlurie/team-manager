namespace TeamManager.Api.Domain.Entities;

public class GameConnectionsParticipant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SessionId { get; set; }
    public Guid MemberId { get; set; }
    public string DisplayName { get; set; } = "";
    public DateTimeOffset JoinedAt { get; set; } = DateTimeOffset.UtcNow;

    public GameConnectionsSession? Session { get; set; }
    public TeamMember? Member { get; set; }
}
