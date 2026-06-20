namespace TeamManager.Api.Application.DTOs.QuizGame;

public record QuizGameSessionSummaryDto
{
    public Guid Id { get; init; }
    public string? Title { get; init; }
    public string Status { get; init; } = string.Empty;
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
}

public record QuizGameSessionDto
{
    public Guid Id { get; init; }
    public string? Title { get; init; }
    public string Status { get; init; } = string.Empty;
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
}

public record CreateQuizGameSessionRequest(string? Title, int QuestionCount = 10);

public record SubmitQuizGameAnswerRequest(int SelectedIndex);
