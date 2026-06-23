namespace TeamManager.Api.Domain.Entities;

// One question per (SessionId, RoundIndex), generated lazily the first time any participant in
// the session reaches that round and reused by everyone else who reaches it later -- keeps
// progress comparable across participants without generating a separate question per person.
public class QuizMillionaireRound
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public int RoundIndex { get; set; }
    public string Question { get; set; } = "";
    public string OptionsJson { get; set; } = "[]";
    public int CorrectIndex { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public QuizGameSession? Session { get; set; }
}
