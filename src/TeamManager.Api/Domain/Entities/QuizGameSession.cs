namespace TeamManager.Api.Domain.Entities;

public enum QuizGameSessionStatus
{
    Waiting,
    InProgress,
    Completed
}

public class QuizGameSession
{
    public Guid Id { get; set; }
    public Guid CreatedByMemberId { get; set; }
    public string? Title { get; set; }
    public int QuestionCount { get; set; } = 10;
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
}
