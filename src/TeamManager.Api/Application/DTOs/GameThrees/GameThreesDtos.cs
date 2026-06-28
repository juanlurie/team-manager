namespace TeamManager.Api.Application.DTOs.GameThrees;

public class GameThreesSessionSummaryDto
{
    public Guid Id { get; set; }
    public string? Title { get; set; }
    public string Status { get; set; } = "";
    public int PlayerCount { get; set; }
    public string CreatedByName { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
}

public class GameThreesParticipantDto
{
    public Guid Id { get; set; }
    public Guid MemberId { get; set; }
    public string DisplayName { get; set; } = "";
    public int Order { get; set; }
    public int Score { get; set; }
    public int[] Board { get; set; } = [];
    public int NextTile { get; set; }
    public bool IsGameOver { get; set; }
    public bool IsMe { get; set; }
}

public class GameThreesSessionDto
{
    public Guid Id { get; set; }
    public string? Title { get; set; }
    public string Status { get; set; } = "";
    public Guid CreatedByMemberId { get; set; }
    public bool IsCreator { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public List<GameThreesParticipantDto> Participants { get; set; } = [];
}

public record CreateGameThreesSessionRequest(string? Title);

public record GameThreesMoveRequest(string Direction);
