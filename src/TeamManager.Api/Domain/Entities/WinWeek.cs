using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Domain.Entities;

public class WinWeek
{
    public Guid Id { get; set; }
    public DateOnly WeekStart { get; set; }
    public DateOnly WeekEnd { get; set; }
    public WinWeekStatus Status { get; set; } = WinWeekStatus.Nominating;
    public Guid? WinnerNominationId { get; set; }
    public string? TiedNominationIds { get; set; }
    public DateTimeOffset OpenedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ClosedAt { get; set; }
    public DateTimeOffset? SuddenDeathEndsAt { get; set; }
    public DateTimeOffset? HypeBattleEndsAt { get; set; }
    public DateTimeOffset? QuizEndsAt { get; set; }
    public string? QuizQuestion { get; set; }
    public string? QuizOptionsJson { get; set; }
    public int? QuizCorrectIndex { get; set; }
    public bool QuizRevealed { get; set; }
    public DateTimeOffset? QuizRevealedAt { get; set; }
    public Guid? QuizWinnerMemberId { get; set; }
    // Host's chosen difficulty for the Quiz Duel, 1-15 scale matching
    // QuizQuestionGeneratorService's difficultyLevel param. Persisted here (not just passed
    // per-call) so BeginNextQuizRoundAsync's auto-loop keeps using it across rounds.
    public int? QuizDifficultyLevel { get; set; }
    // JSON array of nominee member IDs eliminated so far in the current Quiz Duel (wrong answer
    // or didn't answer in time) -- accumulates across BeginNextQuizRoundAsync's auto-loop, reset
    // only when the duel (re)starts or stops. See TryResolveQuizAsync for elimination logic.
    public string? QuizEliminatedMemberIds { get; set; }
    public Guid CreatedByMemberId { get; set; }
    public Guid WinSeriesId { get; set; }
    public string? WinnerStory { get; set; }
    public string? GuestToken { get; set; }

    public WinNomination? Winner { get; set; }
    public TeamMember? CreatedBy { get; set; }
    public WinSeries? Series { get; set; }
    public ICollection<WinNomination> Nominations { get; set; } = [];
    public ICollection<WinQuizAnswer> QuizAnswers { get; set; } = [];
}
