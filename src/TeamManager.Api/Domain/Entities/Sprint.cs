namespace TeamManager.Api.Domain.Entities;

public class Sprint
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public Guid? PIId { get; set; }
    public int? SprintNumber { get; set; }
    public bool IsInnovationSprint { get; set; }
    public string? Goal { get; set; }
    public bool IsActive { get; set; } = true;
    public string? RetroWentWell { get; set; }
    public string? RetroDidntGoWell { get; set; }
    public string? RetroActionItems { get; set; }

    public PI? PI { get; set; }
    public ICollection<SprintMember> SprintMembers { get; set; } = [];
    public ICollection<Feature> Features { get; set; } = [];
}
