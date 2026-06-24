namespace TeamManager.Api.Domain.Entities;

public enum QuizGameSessionStatus
{
    Waiting,
    InProgress,
    Completed
}

// Classic: everyone answers the same question simultaneously each round (existing behavior).
// Millionaire: each participant climbs the prize ladder at their own pace -- see
// QuizMillionaireRound and the Millionaire* fields on QuizGameParticipant.
public enum QuizGameMode
{
    Classic,
    Millionaire
}

public class QuizGameSession
{
    public Guid Id { get; set; }
    public Guid CreatedByMemberId { get; set; }
    public string? Title { get; set; }
    public QuizGameMode GameMode { get; set; } = QuizGameMode.Classic;
    public int QuestionCount { get; set; } = 10;
    // Classic mode only -- 1-15 scale matching QuizQuestionGeneratorService's difficultyLevel
    // param (null = unset, defaults to the generator's own midpoint). Millionaire mode ignores
    // this and escalates per-round via MillionaireLadder instead.
    public int? DifficultyLevel { get; set; }
    public int CurrentQuestionIndex { get; set; } = -1;
    public QuizGameSessionStatus Status { get; set; } = QuizGameSessionStatus.Waiting;
    public string? CurrentQuestion { get; set; }
    public string? CurrentOptionsJson { get; set; }
    public int? CurrentCorrectIndex { get; set; }
    public DateTimeOffset? CurrentQuestionEndsAt { get; set; }
    public bool CurrentQuestionRevealed { get; set; }
    public DateTimeOffset? CurrentQuestionRevealedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }

    public TeamMember? CreatedByMember { get; set; }
    public ICollection<QuizGameParticipant> Participants { get; set; } = [];
    public ICollection<QuizGameAnswer> Answers { get; set; } = [];
    public ICollection<QuizMillionaireRound> MillionaireRounds { get; set; } = [];
}
