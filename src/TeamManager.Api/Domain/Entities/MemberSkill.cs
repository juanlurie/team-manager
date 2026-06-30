namespace TeamManager.Api.Domain.Entities;

public class MemberSkill
{
    public Guid Id { get; set; }
    public Guid TeamMemberId { get; set; }
    public string Name { get; set; } = "";
    public string? Category { get; set; }

    public TeamMember TeamMember { get; set; } = null!;
    public ICollection<MemberSkillRating> Ratings { get; set; } = [];
}
