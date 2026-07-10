namespace TeamManager.Api.Domain.Entities;

public class ProcessFlowNode
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public string Label { get; set; } = "";
    public double PositionX { get; set; }
    public double PositionY { get; set; }
    public double Width { get; set; } = 160;
    public double Height { get; set; } = 64;
    public string Shape { get; set; } = "rectangle";
    public string? Color { get; set; }
    public Guid CreatedByMemberId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ProcessFlowSession Session { get; set; } = null!;
}
