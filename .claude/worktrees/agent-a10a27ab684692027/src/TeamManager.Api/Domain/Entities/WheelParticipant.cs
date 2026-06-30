namespace TeamManager.Api.Domain.Entities;

public class WheelParticipant
{
    public Guid WheelId { get; set; }
    public Wheel Wheel { get; set; } = null!;
    public Guid TeamMemberId { get; set; }
    public TeamMember TeamMember { get; set; } = null!;
}
