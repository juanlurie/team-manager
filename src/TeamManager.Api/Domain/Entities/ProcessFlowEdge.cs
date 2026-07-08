namespace TeamManager.Api.Domain.Entities;

public class ProcessFlowEdge
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public Guid FromNodeId { get; set; }
    public Guid ToNodeId { get; set; }
    public string? Label { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ProcessFlowSession Session { get; set; } = null!;
}
