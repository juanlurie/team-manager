namespace TeamManager.Api.Domain.Entities;

public class PersonalMapNode
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public string Label { get; set; } = "";
    public double PositionX { get; set; }
    public double PositionY { get; set; }
    public double Width { get; set; } = 160;
    public double Height { get; set; } = 64;
    public string? Color { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public PersonalMapSession Session { get; set; } = null!;
}
