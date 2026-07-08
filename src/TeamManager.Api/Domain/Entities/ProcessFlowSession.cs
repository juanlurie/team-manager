namespace TeamManager.Api.Domain.Entities;

public class ProcessFlowSession
{
    public Guid Id { get; set; }
    public string? Title { get; set; }
    public Guid CreatedByMemberId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<ProcessFlowNode> Nodes { get; set; } = [];
    public ICollection<ProcessFlowEdge> Edges { get; set; } = [];
}
