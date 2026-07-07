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
}
