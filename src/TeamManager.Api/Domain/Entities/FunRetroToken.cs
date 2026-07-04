namespace TeamManager.Api.Domain.Entities;

public class FunRetroToken
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public string Column { get; set; } = "well"; // well|better|action -- which canvas/zone it renders in
    public string Emoji { get; set; } = "";
    public string Size { get; set; } = "medium"; // small|medium|large
    public double PositionX { get; set; }
    public double PositionY { get; set; }
    public Guid CreatedByMemberId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public FunRetroSession Session { get; set; } = null!;
}
