namespace TeamManager.Api.Domain.Entities;

public class Squad
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Color { get; set; }

    public ICollection<SquadMember> Members { get; set; } = [];
}
