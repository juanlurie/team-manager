namespace TeamManager.Api.Domain.Entities;

public class ProcessFlowEdge
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public Guid FromNodeId { get; set; }
    public Guid ToNodeId { get; set; }
    public string? Label { get; set; }
    // JSON array of intermediate bend points, e.g. [{"x":10,"y":20},...]. Null/empty = a straight
    // edge. Stored as a string so the routing stays a pure client concern; the server just persists.
    public string? Waypoints { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ProcessFlowSession Session { get; set; } = null!;
}
