namespace TeamManager.Api.Domain.Entities;

public class QuizGameAnswer
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public int QuestionIndex { get; set; }
    public Guid MemberId { get; set; }
    public int SelectedIndex { get; set; }
    public bool IsCorrect { get; set; }
    public DateTimeOffset AnsweredAt { get; set; } = DateTimeOffset.UtcNow;

    public QuizGameSession? Session { get; set; }
}
