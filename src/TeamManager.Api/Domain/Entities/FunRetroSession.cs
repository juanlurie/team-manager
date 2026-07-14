namespace TeamManager.Api.Domain.Entities;

public class FunRetroSession
{
    public Guid Id { get; set; }
    public string? Slug { get; set; } // friendly "adjective-noun" share URL, null for sessions created before this existed
    public string? Title { get; set; }
    public string Phase { get; set; } = "lobby"; // lobby|add|vote|discuss|done
    public Guid CreatedByMemberId { get; set; }
    public Guid? SprintId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public TeamMember? CreatedBy { get; set; }
    public Sprint? Sprint { get; set; }
    public ICollection<FunRetroCard> Cards { get; set; } = [];
    public ICollection<FunRetroToken> Tokens { get; set; } = [];
    public ICollection<FunRetroCheckinQuestion> CheckinQuestions { get; set; } = [];
    public string? AiAnalysisJson { get; set; }
    public string? TimerJson { get; set; }
    public string? IcebreakerAnswersJson { get; set; }
    public string? IcebreakerQuestion { get; set; }
    public string? ColumnsJson { get; set; }
    public bool HideCardsOnAdd { get; set; } = true;
    // One-shot manual override that reveals every card immediately -- including ones added
    // afterward, for the rest of this "add" phase -- without flipping HideCardsOnAdd itself
    // (a persistent setting the creator may still want on for a future session) or advancing
    // the phase. Only meaningful during "add" -- hiding never applies outside it anyway.
    public bool ManuallyRevealed { get; set; }
    public bool ParticipationTracking { get; set; } = true;
    // null|space|f1|ocean|retro-gaming, or a RetroCustomTheme's Guid (as a string) from the
    // shared library.
    public string? Theme { get; set; }
    public string? CanvasLayout { get; set; } // null|columns|single -- null/"columns" = today's per-column canvases
    // Facilitator opt-in vote caps (ported from RetroBoard). Null VotesPerUser = unlimited session
    // budget; MaxVotesPerCard defaults to 1 (today's one-vote-per-card toggle behaviour). Setting
    // MaxVotesPerCard > 1 lets a member stack multiple votes on the same card.
    public int? VotesPerUser { get; set; } = 3;
    public int MaxVotesPerCard { get; set; } = 1;
    // Facilitator opt-in per-phase timer presets (ported from RetroBoard's step durations), stored
    // as { add, vote, discuss } seconds. Null = no presets; the meeting budget is their sum.
    public string? StepDurationsJson { get; set; }
    // Facilitator opt-in: adds a "check-in" phase before "add" (ported from RetroBoard), seeded
    // from the creator's previous retro's open action items.
    public bool CheckinEnabled { get; set; }
}
