namespace TeamManager.Api.Domain.Entities;

public class Squad
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Color { get; set; }

    // Optional: a squad may sit outside any team. A member's team is derived
    // through this FK, never stored on TeamMember.
    public Guid? TeamId { get; set; }
    public Team? Team { get; set; }

    public ICollection<SquadMember> Members { get; set; } = [];
}
