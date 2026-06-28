namespace TeamManager.Api.Application.DTOs.GameUltimateTtt;

public class GameUltimateTttSessionSummaryDto
{
    public Guid Id { get; set; }
    public string? Title { get; set; }
    public string Status { get; set; } = "";
    public int PlayerCount { get; set; }
    public string CreatedByName { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
}

public class GameUltimateTttParticipantDto
{
    public Guid Id { get; set; }
    public Guid? MemberId { get; set; }
    public string DisplayName { get; set; } = "";
    public int Order { get; set; }   // 0 = X, 1 = O
    public int Score { get; set; }   // small boards won
    public bool IsWinner { get; set; }
    public bool IsMe { get; set; }
    public bool IsAi { get; set; }
}

public class GameUltimateTttSessionDto
{
    public Guid Id { get; set; }
    public string? Title { get; set; }
    public string Status { get; set; } = "";
    public Guid CreatedByMemberId { get; set; }
    public bool IsCreator { get; set; }
    public bool IsAiGame { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public List<GameUltimateTttParticipantDto> Participants { get; set; } = [];
    public int[] Cells { get; set; } = [];     // 81 ints: 0=empty 1=X 2=O
    public int[] BigBoard { get; set; } = [];  // 9 ints:  0=empty 1=X 2=O 3=draw
    public Guid? CurrentTurnMemberId { get; set; }
    public int NextBoardIndex { get; set; }    // -1=free, 0-8=required
    public Guid? WinnerMemberId { get; set; }
}

public record CreateGameUltimateTttSessionRequest(string? Title, bool VsAi = false);
public record GameUltimateTttMoveRequest(int Position); // 0-80
