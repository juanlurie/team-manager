namespace TeamManager.Api.Domain.Entities;

public class PI
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string? Description { get; set; }

    public ICollection<Sprint> Sprints { get; set; } = [];
}
