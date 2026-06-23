namespace TeamManager.Api.Application.DTOs.QuizGame;

public record QuizGameSessionSummaryDto
{
    public Guid Id { get; init; }
    public string? Title { get; init; }
    public string Status { get; init; } = string.Empty;
    public string GameMode { get; init; } = "Classic";
    public int QuestionCount { get; init; }
    public string CreatedByName { get; init; } = string.Empty;
    public int ParticipantCount { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public record QuizGameParticipantDto
{
    public Guid MemberId { get; init; }
    public string MemberName { get; init; } = string.Empty;
    public int Score { get; init; }
    // Millionaire mode only -- ignored for Classic sessions.
    public int MillionaireRoundIndex { get; init; } = -1;
    public long MillionaireWinnings { get; init; }
    public string MillionaireStatus { get; init; } = "NotStarted";
}

// My own Millionaire run within the session -- only populated when GameMode is Millionaire and
// the caller is a participant.
public record QuizMillionaireRunDto
{
    public int RoundIndex { get; init; } = -1;
    public string Status { get; init; } = "NotStarted";
    public string? Question { get; init; }
    public List<string> Options { get; init; } = [];
    public DateTimeOffset? EndsAt { get; init; }
    public long Winnings { get; init; }
    // The prize banked if eliminated on the current round (last safe haven cleared).
    public long SafeHavenWinnings { get; init; }
    // Populated only once eliminated/timed out, to reveal what the correct answer actually was.
    public int? RevealedCorrectIndex { get; init; }
}

public record QuizGameSessionDto
{
    public Guid Id { get; init; }
    public string? Title { get; init; }
    public string Status { get; init; } = string.Empty;
    public string GameMode { get; init; } = "Classic";
    public int QuestionCount { get; init; }
    public int CurrentQuestionIndex { get; init; }
    public string? CurrentQuestion { get; init; }
    public List<string> CurrentOptions { get; init; } = [];
    public DateTimeOffset? CurrentQuestionEndsAt { get; init; }
    public bool CurrentQuestionRevealed { get; init; }
    public DateTimeOffset? RevealEndsAt { get; init; }
    public int? CurrentCorrectIndex { get; init; }
    public int? MyAnswerIndex { get; init; }
    public List<Guid> AnsweredMemberIds { get; init; } = [];
    public bool IsCreator { get; init; }
    public bool IsParticipant { get; init; }
    public Guid CurrentMemberId { get; init; }
    public List<QuizGameParticipantDto> Participants { get; init; } = [];

    // Millionaire mode only.
    public List<long> MillionairePrizeLadder { get; init; } = [];
    public List<int> MillionaireSafeHavenRounds { get; init; } = [];
    public QuizMillionaireRunDto? MyMillionaireRun { get; init; }
}

public record CreateQuizGameSessionRequest(string? Title, int QuestionCount = 10, string GameMode = "Classic");

public record SubmitQuizGameAnswerRequest(int SelectedIndex);
