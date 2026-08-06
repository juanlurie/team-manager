namespace TeamManager.Api.Domain.Entities;

public class Team
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public ICollection<Squad> Squads { get; set; } = [];
}
