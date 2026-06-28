namespace TeamManager.Api.Application.DTOs.Game2048;

public class Game2048SessionSummaryDto
{
    public Guid Id { get; set; }
    public string? Title { get; set; }
    public string Status { get; set; } = "";
    public int PlayerCount { get; set; }
    public string CreatedByName { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
}

public class Game2048ParticipantDto
{
    public Guid Id { get; set; }
    public Guid MemberId { get; set; }
    public string DisplayName { get; set; } = "";
    public int Order { get; set; }
    public int Score { get; set; }
    public int[] Board { get; set; } = [];
    public bool IsGameOver { get; set; }
    public bool HasWon { get; set; }
    public bool IsMe { get; set; }
}

public class Game2048SessionDto
{
    public Guid Id { get; set; }
    public string? Title { get; set; }
    public string Status { get; set; } = "";
    public Guid CreatedByMemberId { get; set; }
    public bool IsCreator { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public List<Game2048ParticipantDto> Participants { get; set; } = [];
}

public class CreateGame2048SessionRequest
{
    public string? Title { get; set; }
}

public class Game2048MoveRequest
{
    public string Direction { get; set; } = ""; // left | right | up | down
}
