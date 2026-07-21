namespace TeamManager.Api.Domain.Entities;

/// <summary>
/// A facilitated retrospective session ("RetroBoard"). Distinct from the legacy sprint
/// retro (RetroCard/RetroAction) and the free-canvas FunRetroSession -- this is the
/// structured, phase-guided flow: setup → check-in → capture → introduce → vote →
/// discuss → reflect → summary.
/// </summary>
public class RetroBoardSession
{
    public Guid Id { get; set; }

    /// <summary>Friendly "adjective-noun" join code / share URL (SlugGenerator), unique when set.</summary>
    public string? Slug { get; set; }
    public string? Title { get; set; }

    /// <summary>Owning team. Optional -- ad-hoc sessions are allowed; carry-forward and
    /// team history only apply when a Squad is set.</summary>
    public Guid? SquadId { get; set; }
    public Guid? SprintId { get; set; }
    public Guid CreatedByMemberId { get; set; }

    /// <summary>setup|checkin|capture|introduce|vote|discuss|reflect|summary</summary>
    public string Phase { get; set; } = "setup";
    /// <summary>draft|live|closed</summary>
    public string Status { get; set; } = "draft";

    public int VotesPerUser { get; set; } = 6;
    /// <summary>Content-level anonymity: whether a note's author may be hidden ("anonymous notes").
    /// Independent of how a participant joined. See docs/session-identity.md (allowAnonymousContent).</summary>
    public bool AllowAnonymous { get; set; } = true;
    /// <summary>Join-level: whether someone with no member record for this session's team may join as
    /// a guest (display name + session token). Off by default; the join flow itself lands in a later
    /// slice. See docs/session-identity.md (allowGuestJoin).</summary>
    public bool AllowGuestJoin { get; set; }
    public bool HideNotesUntilReveal { get; set; } = true;
    /// <summary>One-shot global reveal that shows every note during Capture, regardless of HideNotesUntilReveal.</summary>
    public bool NotesRevealed { get; set; }

    /// <summary>Per-step timer durations in seconds, keyed by step
    /// (checkin, capture, introduceRead, introduceTopic, vote, discussTopic, reflect).</summary>
    public string? StepDurationsJson { get; set; }
    /// <summary>Per-phase config (Session Structure), keyed by phase → { enabled, enforced, timed }.
    /// A convenience layer that skips/gates phases without changing the phase flow; null = all defaults.</summary>
    public string? PhaseConfigJson { get; set; }
    /// <summary>Transient live sub-state: intro stage, current spotlight note id, and the running
    /// clock (startedAt/pausedAt) so reconnecting clients resume in sync.</summary>
    public string? LiveStateJson { get; set; }
    /// <summary>Emails (one per entry) the summary is sent to when the session closes.</summary>
    public string? InviteEmailsJson { get; set; }
    /// <summary>AI Reflect output: { strengthThemes, improveThemes, insights, suggestedActions }.</summary>
    public string? AiSummaryJson { get; set; }

    /// <summary>Archived sessions are filed away — hidden from the active lobby but retrievable in the
    /// archived view. Independent of Status: a session is typically closed first, then archived; reopening un-archives.</summary>
    public bool IsArchived { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? ClosedAt { get; set; }
    public DateTimeOffset? ArchivedAt { get; set; }

    public TeamMember? CreatedBy { get; set; }
    public Squad? Squad { get; set; }
    public Sprint? Sprint { get; set; }
    public ICollection<RetroBoardColumn> Columns { get; set; } = [];
    public ICollection<RetroBoardNote> Notes { get; set; } = [];
    public ICollection<RetroBoardCheckinQuestion> CheckinQuestions { get; set; } = [];
    public ICollection<RetroBoardParticipant> Participants { get; set; } = [];
    public ICollection<RetroBoardAction> Actions { get; set; } = [];
    public ICollection<RetroBoardFeedbackPrompt> FeedbackPrompts { get; set; } = [];
}
