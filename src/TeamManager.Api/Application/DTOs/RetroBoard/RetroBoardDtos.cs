namespace TeamManager.Api.Application.DTOs.RetroBoard;

// ---------- Read models ----------

public record RetroBoardSessionDto
{
    public Guid Id { get; init; }
    public string? Slug { get; init; }
    public string? Title { get; init; }
    public Guid? SquadId { get; init; }
    public string? SquadName { get; init; }
    public Guid? SprintId { get; init; }
    public string? SprintName { get; init; }
    public Guid CreatedByMemberId { get; init; }
    public bool IsFacilitator { get; init; }   // is the requesting member a facilitator?
    public string Phase { get; init; } = "setup";
    public string Status { get; init; } = "draft";
    public int VotesPerUser { get; init; }
    public int MyVotesUsed { get; init; }
    public bool AllowAnonymous { get; init; }
    public bool AllowGuestJoin { get; init; }
    public bool HideNotesUntilReveal { get; init; }
    public bool NotesRevealed { get; init; }
    public bool IsArchived { get; init; }
    public RetroStepDurations StepDurations { get; init; } = new();
    /// <summary>Per-phase Session-Structure flags, keyed by phase (checkin/introduce/reflect/…).</summary>
    public Dictionary<string, RetroPhaseFlags> PhaseConfig { get; init; } = new();
    /// <summary>Ordered phases active this run — config toggles AND content (auto-skip empty
    /// check-in/reflect) folded in. Single source of truth for the stepper/navigation/GoLive.</summary>
    public List<string> EnabledPhases { get; init; } = [];
    public string? LiveStateJson { get; init; }   // opaque live sub-state; client parses
    public RetroBoardAiSummaryDto? AiSummary { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? StartedAt { get; init; }
    public DateTimeOffset? ClosedAt { get; init; }
    public DateTimeOffset? ArchivedAt { get; init; }
    public List<RetroBoardColumnDto> Columns { get; init; } = [];
    public List<RetroBoardNoteDto> Notes { get; init; } = [];
    public List<RetroBoardCheckinQuestionDto> CheckinQuestions { get; init; } = [];
    public List<RetroBoardParticipantDto> Participants { get; init; } = [];
    public List<RetroBoardActionDto> Actions { get; init; } = [];
    public List<RetroBoardFeedbackPromptDto> FeedbackPrompts { get; init; } = [];
}

public record RetroStepDurations
{
    public int Meeting { get; init; } = 3600;   // total meeting budget, for the "time left" indicator
    public int Checkin { get; init; } = 180;
    public int Capture { get; init; } = 480;
    public int IntroduceRead { get; init; } = 60;
    public int IntroduceTopic { get; init; } = 30;
    public int Vote { get; init; } = 300;
    public int DiscussTopic { get; init; } = 120;
    public int Reflect { get; init; } = 120;
}

public record RetroBoardColumnDto
{
    public Guid Id { get; init; }
    public string Key { get; init; } = "";
    public string Label { get; init; } = "";
    public string? Description { get; init; }
    public string Color { get; init; } = "";
    public string Icon { get; init; } = "";
    public int SortOrder { get; init; }
}

public record RetroBoardNoteDto
{
    public Guid Id { get; init; }
    public Guid ColumnId { get; init; }
    public string ColumnKey { get; init; } = "";
    public string? Text { get; init; }        // null when hidden until reveal (others' notes in Capture)
    public Guid? AuthorId { get; init; }       // null when anonymous
    public string? AuthorName { get; init; }
    public string? AuthorAvatarSeed { get; init; }
    public bool IsAnonymous { get; init; }
    public bool IsOwn { get; init; }
    public bool Flagged { get; init; }
    public string? Clarification { get; init; }
    public DateTimeOffset? IntroducedAt { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public int VoteCount { get; init; }
    public int MyVoteCount { get; init; }
}

public record RetroBoardCheckinQuestionDto
{
    public Guid Id { get; init; }
    public string Text { get; init; } = "";
    public string? ContextText { get; init; }
    public Guid? SourceActionId { get; init; }
    public int SortOrder { get; init; }
    public string? MyRating { get; init; }     // better|same|worse|na, or null
    public int Better { get; init; }
    public int Same { get; init; }
    public int Worse { get; init; }
    public int Na { get; init; }
}

public record RetroBoardParticipantDto
{
    public Guid Id { get; init; }
    /// <summary>Null for a guest participant (no member record); see <see cref="IsGuest"/>.</summary>
    public Guid? MemberId { get; init; }
    /// <summary>True when this participant joined as a guest (name-only, no member link).</summary>
    public bool IsGuest { get; init; }
    public string Name { get; init; } = "";
    public string? AvatarSeed { get; init; }
    public string Role { get; init; } = "participant";

    /// <summary>Per-phase "has this member participated" flags, keyed by phase. There is no manual
    /// Done button, so each is derived from actual contributions (see <c>RetroResponded</c>):
    /// <list type="bullet">
    /// <item><c>checkin</c> — answered <b>every</b> check-in question.</item>
    /// <item><c>capture</c> — added <b>at least one</b> named note (anonymous notes have no author).</item>
    /// <item><c>vote</c> — cast <b>at least one</b> vote.</item>
    /// <item><c>reflect</c> — rated <b>every</b> feedback prompt.</item>
    /// </list>
    /// Note the semantics differ by phase (all vs at-least-one) — that is intentional.</summary>
    public Dictionary<string, bool> Responded { get; init; } = new();
}

public record RetroBoardActionDto
{
    public Guid Id { get; init; }
    public Guid? SourceNoteId { get; init; }
    public string Title { get; init; } = "";
    public Guid? OwnerMemberId { get; init; }
    public string? OwnerName { get; init; }
    public List<Guid> AssigneeMemberIds { get; init; } = [];
    public string Status { get; init; } = "open";
    public DateOnly? DueDate { get; init; }
    public bool IsAiSuggested { get; init; }
}

public record RetroBoardFeedbackPromptDto
{
    public Guid Id { get; init; }
    public string Text { get; init; } = "";
    public int SortOrder { get; init; }

    // The requesting member's own response (participant view).
    public int? MyScore { get; init; }
    public string? MyComment { get; init; }

    // Anonymous aggregate — only populated for facilitators.
    public int ResponseCount { get; init; }
    public double? AverageScore { get; init; }
    /// <summary>Counts of each star value 1..5, index 0 = one star.</summary>
    public List<int> Distribution { get; init; } = [0, 0, 0, 0, 0];
    /// <summary>Free-text comments, anonymous and shuffled so they can't be tied to a rating order.</summary>
    public List<string> Comments { get; init; } = [];
}

public record RetroBoardAiSummaryDto
{
    public List<string> StrengthThemes { get; init; } = [];
    public List<string> ImproveThemes { get; init; } = [];
    public List<string> Insights { get; init; } = [];
    public List<string> SuggestedActions { get; init; } = [];
}

public record RetroBoardSummaryDto
{
    public Guid Id { get; init; }
    public string? Title { get; init; }
    public string? Slug { get; init; }
    public string Phase { get; init; } = "setup";
    public string Status { get; init; } = "draft";
    public string? SquadName { get; init; }
    public Guid CreatedByMemberId { get; init; }
    public string CreatedByName { get; init; } = "";
    public bool IsFacilitator { get; init; }
    public bool IsArchived { get; init; }
    public int ParticipantCount { get; init; }
    public int NoteCount { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? ClosedAt { get; init; }
}

// ---------- Write models ----------

public record CreateRetroBoardSessionRequest
{
    public string? Title { get; init; }
    public Guid? SquadId { get; init; }
    public Guid? SprintId { get; init; }
    public List<RetroColumnInput>? Columns { get; init; }        // null = default four columns
    public List<CheckinQuestionInput>? CheckinQuestions { get; init; }
    public List<FeedbackPromptInput>? FeedbackPrompts { get; init; }
    public int? VotesPerUser { get; init; }
    public bool? AllowAnonymous { get; init; }
    public bool? HideNotesUntilReveal { get; init; }
    public RetroStepDurations? StepDurations { get; init; }
    public bool SeedFromPreviousRetro { get; init; } = true;     // carry forward check-in from last closed session (when Squad set)
}

public record RetroColumnInput
{
    public string Key { get; init; } = "";
    public string Label { get; init; } = "";
    public string? Description { get; init; }
    public string Color { get; init; } = "#5b9dff";
    public string Icon { get; init; } = "star";
}

public record CheckinQuestionInput
{
    public string Text { get; init; } = "";
    public string? ContextText { get; init; }
}

public record AddRetroBoardNoteRequest
{
    public Guid ColumnId { get; init; }
    public string Text { get; init; } = "";
    public bool IsAnonymous { get; init; }
}

public record UpdateRetroBoardSettingsRequest
{
    public int? VotesPerUser { get; init; }
    public bool? AllowAnonymous { get; init; }
    public bool? HideNotesUntilReveal { get; init; }
    public RetroStepDurations? StepDurations { get; init; }
    public Dictionary<string, RetroPhaseFlags>? PhaseConfig { get; init; }
}

/// <summary>Per-phase Session-Structure flags. `enabled` = included this run; `enforced`/`timed` gate
/// the live flow (honoured from Slice 2). Defaults keep the full structured behaviour.</summary>
public record RetroPhaseFlags
{
    public bool Enabled { get; init; } = true;
    public bool Enforced { get; init; } = true;
    public bool Timed { get; init; } = true;
}

public record SetColumnsRequest { public List<RetroColumnInput> Columns { get; init; } = []; }

public record SetPhaseRequest { public string Phase { get; init; } = ""; }
public record LiveStateRequest { public string? LiveStateJson { get; init; } }
public record NoteTextRequest { public string Text { get; init; } = ""; }
public record ClarifyRequest { public string? Clarification { get; init; } }
public record FlagRequest { public bool Flagged { get; init; } }
public record IntroducedRequest { public bool Introduced { get; init; } }
public record CheckinResponseRequest { public string Rating { get; init; } = ""; }
public record FeedbackPromptInput { public string Text { get; init; } = ""; }
public record FeedbackResponseRequest { public int Score { get; init; } public string? Comment { get; init; } }
public record SetParticipantRoleRequest { public Guid MemberId { get; init; } public string Role { get; init; } = "participant"; }
public record SetSquadRequest { public Guid? SquadId { get; init; } }

public record AddRetroBoardActionRequest
{
    public string Title { get; init; } = "";
    public Guid? OwnerMemberId { get; init; }
    public Guid? SourceNoteId { get; init; }
    public List<Guid>? AssigneeMemberIds { get; init; }
}

public record UpdateRetroBoardActionRequest
{
    public string? Title { get; init; }
    public Guid? OwnerMemberId { get; init; }
    public string? Status { get; init; }
    public DateOnly? DueDate { get; init; }
    public List<Guid>? AssigneeMemberIds { get; init; }
}
