namespace TeamManager.Api.Application.DTOs.ProcessFlow;

public record ProcessFlowNodeDto
{
    public Guid Id { get; init; }
    public Guid SessionId { get; init; }
    public string Label { get; init; } = "";
    public double PositionX { get; init; }
    public double PositionY { get; init; }
    public double Width { get; init; }
    public double Height { get; init; }
    public string? Color { get; init; }
    public Guid CreatedByMemberId { get; init; }
}

public record ProcessFlowPointDto
{
    public double X { get; init; }
    public double Y { get; init; }
}

public record ProcessFlowEdgeDto
{
    public Guid Id { get; init; }
    public Guid SessionId { get; init; }
    public Guid FromNodeId { get; init; }
    public Guid ToNodeId { get; init; }
    public string? Label { get; init; }
    public List<ProcessFlowPointDto> Waypoints { get; init; } = [];
}

public record ProcessFlowSessionDto
{
    public Guid Id { get; init; }
    public string? Title { get; init; }
    public Guid CreatedByMemberId { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public List<ProcessFlowNodeDto> Nodes { get; init; } = [];
    public List<ProcessFlowEdgeDto> Edges { get; init; } = [];
}

public record ProcessFlowSessionSummaryDto
{
    public Guid Id { get; init; }
    public string? Title { get; init; }
    public Guid CreatedByMemberId { get; init; }
    public string CreatedByName { get; init; } = "";
    public int NodeCount { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public record CreateProcessFlowSessionRequest
{
    public string? Title { get; init; }
}

public record AddProcessFlowNodeRequest
{
    public string Label { get; init; } = "";
    public double PositionX { get; init; }
    public double PositionY { get; init; }
    public string? Color { get; init; }
}

public record UpdateProcessFlowNodePositionRequest
{
    public double PositionX { get; init; }
    public double PositionY { get; init; }
}

public record UpdateProcessFlowNodeTextRequest
{
    public string Label { get; init; } = "";
}

public record UpdateProcessFlowNodeSizeRequest
{
    public double Width { get; init; }
    public double Height { get; init; }
}

public record UpdateProcessFlowNodeColorRequest
{
    public string? Color { get; init; }
}

public record AddProcessFlowEdgeRequest
{
    public Guid FromNodeId { get; init; }
    public Guid ToNodeId { get; init; }
    public string? Label { get; init; }
}

public record UpdateProcessFlowEdgeWaypointsRequest
{
    public List<ProcessFlowPointDto> Waypoints { get; init; } = [];
}
