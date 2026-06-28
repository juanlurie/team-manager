namespace TeamManager.Api.Domain.Entities;

public class MemberPersonal
{
    public Guid TeamMemberId { get; set; }
    public string? PersonalMap { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public TeamMember TeamMember { get; set; } = null!;
}
