namespace TeamManager.Api.Domain.Entities;

// Only meaningful when the session's GameMode is Millionaire -- NotStarted until the
// participant chooses to begin their own run.
public enum QuizMillionaireStatus
{
    NotStarted,
    Playing,
    Eliminated,
    WalkedAway,
    Won
}

public class QuizGameParticipant
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public Guid MemberId { get; set; }
    public int Score { get; set; }
    public DateTimeOffset JoinedAt { get; set; } = DateTimeOffset.UtcNow;

    // Millionaire-mode pacing -- each participant climbs the ladder independently, so (unlike
    // Classic's single session-level CurrentQuestionIndex) this progress lives per participant.
    public int MillionaireRoundIndex { get; set; } = -1;
    public DateTimeOffset? MillionaireRoundEndsAt { get; set; }
    public long MillionaireWinnings { get; set; }
    public QuizMillionaireStatus MillionaireStatus { get; set; } = QuizMillionaireStatus.NotStarted;
    // Reserved for lifelines (50:50 etc.) so adding them later doesn't need another migration
    // touching this table -- unused today.
    public string? MillionaireLifelinesUsedJson { get; set; }

    public QuizGameSession? Session { get; set; }
    public TeamMember? Member { get; set; }
}
