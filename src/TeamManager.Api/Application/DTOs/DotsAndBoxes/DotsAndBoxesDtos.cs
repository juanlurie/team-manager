namespace TeamManager.Api.Application.DTOs.DotsAndBoxes;

public record DotsAndBoxesSessionSummaryDto
{
    public Guid Id { get; init; }
    public string? Title { get; init; }
    public string Status { get; init; } = "waiting";
    public int GridSize { get; init; }
    public int PlayerCount { get; init; }
    public string CreatedByName { get; init; } = "";
    public DateTimeOffset CreatedAt { get; init; }
}

public record DotsAndBoxesParticipantDto
{
    public Guid Id { get; init; }
    public Guid MemberId { get; init; }
    public string DisplayName { get; init; } = "";
    public int Order { get; init; }
    public int Score { get; init; }
    public bool IsMe { get; init; }
    public bool IsCurrentTurn { get; init; }
}

public record DotsAndBoxesLineDto
{
    public string T { get; init; } = "H"; // "H" or "V"
    public int R { get; init; }
    public int C { get; init; }
}

public record DotsAndBoxesSessionDto
{
    public Guid Id { get; init; }
    public string? Title { get; init; }
    public string Status { get; init; } = "waiting";
    public int GridSize { get; init; }
    public List<DotsAndBoxesLineDto> Lines { get; init; } = [];
    public Dictionary<string, Guid> Boxes { get; init; } = [];
    public Guid? CurrentParticipantId { get; init; }
    public Guid CreatedByMemberId { get; init; }
    public bool IsCreator { get; init; }
    public bool IsMyTurn { get; init; }
    public Guid? MyParticipantId { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public List<DotsAndBoxesParticipantDto> Participants { get; init; } = [];
}

public record CreateDotsAndBoxesSessionRequest
{
    public string? Title { get; init; }
    public int GridSize { get; init; } = 4;
}

public record MakeDotsAndBoxesMoveRequest
{
    public string T { get; init; } = "H";
    public int R { get; init; }
    public int C { get; init; }
}
