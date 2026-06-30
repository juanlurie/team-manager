namespace TeamManager.Api.Domain.Entities;

public class SquadMember
{
    public Guid Id { get; set; }
    public Guid SquadId { get; set; }
    public Guid TeamMemberId { get; set; }

    public Squad Squad { get; set; } = null!;
    public TeamMember TeamMember { get; set; } = null!;
}
