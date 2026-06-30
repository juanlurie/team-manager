namespace TeamManager.Api.Domain.Entities;

public class Achievement
{
    public Guid Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int Points { get; set; }

    public ICollection<MemberAchievement> MemberAchievements { get; set; } = [];
}
