namespace TeamManager.Api.Domain.Entities;

public class MemberSkillRating
{
    public Guid Id { get; set; }
    public Guid MemberSkillId { get; set; }
    public int Rating { get; set; }
    public string? Notes { get; set; }
    public DateOnly RatedAt { get; set; }

    public MemberSkill MemberSkill { get; set; } = null!;
}
