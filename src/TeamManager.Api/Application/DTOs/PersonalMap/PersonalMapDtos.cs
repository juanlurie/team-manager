namespace TeamManager.Api.Application.DTOs.PersonalMap;

public record PersonalMapNodeDto
{
    public Guid Id { get; init; }
    public Guid SessionId { get; init; }
    public string Label { get; init; } = "";
    public double PositionX { get; init; }
    public double PositionY { get; init; }
    public double Width { get; init; }
    public double Height { get; init; }
    public string? Color { get; init; }
}

public record PersonalMapSessionDto
{
    public Guid Id { get; init; }
    public string? Title { get; init; }
    public Guid CreatedByMemberId { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public List<PersonalMapNodeDto> Nodes { get; init; } = [];
}

public record PersonalMapSessionSummaryDto
{
    public Guid Id { get; init; }
    public string? Title { get; init; }
    public int NodeCount { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public record CreatePersonalMapSessionRequest
{
    public string? Title { get; init; }
}

public record AddPersonalMapNodeRequest
{
    public string Label { get; init; } = "";
    public double PositionX { get; init; }
    public double PositionY { get; init; }
    public string? Color { get; init; }
}

public record UpdatePersonalMapNodePositionRequest
{
    public double PositionX { get; init; }
    public double PositionY { get; init; }
}

public record UpdatePersonalMapNodeTextRequest
{
    public string Label { get; init; } = "";
}

public record UpdatePersonalMapNodeSizeRequest
{
    public double Width { get; init; }
    public double Height { get; init; }
}

public record UpdatePersonalMapNodeColorRequest
{
    public string? Color { get; init; }
}
