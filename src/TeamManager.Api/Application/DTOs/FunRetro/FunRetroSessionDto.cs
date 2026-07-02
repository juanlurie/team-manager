namespace TeamManager.Api.Application.DTOs.FunRetro;

public record FunRetroSessionDto
{
    public Guid Id { get; init; }
    public string? Title { get; init; }
    public string Phase { get; init; } = "lobby";
    public Guid CreatedByMemberId { get; init; }
    public bool IsCreator { get; init; }
    public Guid? SprintId { get; init; }
    public string? SprintName { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public List<FunRetroCardDto> Cards { get; init; } = [];
    public int TotalCardCount { get; init; }
    public FunRetroAnalysisDto? AiAnalysis { get; init; }
    public string? TimerJson { get; init; }
    public List<IcebreakerAnswerDto> IcebreakerAnswers { get; init; } = [];
    public string? IcebreakerQuestion { get; init; }
    public List<RetroColumnDto> Columns { get; init; } = [];
    public bool HideCardsOnAdd { get; init; }
    public bool ParticipationTracking { get; init; }
    public string? Theme { get; init; }
}

public record IcebreakerAnswerDto
{
    public Guid MemberId { get; init; }
    public string MemberName { get; init; } = "";
    public string Answer { get; init; } = "";
}

public record FunRetroPrevActionDto
{
    public Guid Id { get; init; }
    public string Text { get; init; } = "";
    public string? AuthorName { get; init; }
}

public record FunRetroAnalysisDto
{
    public List<string> WellThemes { get; init; } = [];
    public List<string> BetterThemes { get; init; } = [];
    public List<string> ActionThemes { get; init; } = [];
    public List<string> KeyInsights { get; init; } = [];
    public List<string> SuggestedActions { get; init; } = [];
}

public record FunRetroCardDto
{
    public Guid Id { get; init; }
    public Guid SessionId { get; init; }
    public string Column { get; init; } = "well";
    public string? Text { get; init; } // null when hidden (other people's cards during add)
    public string? AuthorName { get; init; } // null when hidden
    public Guid AuthorId { get; init; }
    public string? AuthorAvatarSeed { get; init; }
    public bool IsOwn { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public int VoteCount { get; init; }
    public int MyVoteCount { get; init; }
    public List<FunRetroReactionDto> Reactions { get; init; } = [];
    public double? PositionX { get; init; }
    public double? PositionY { get; init; }
    public string? Color { get; init; }
    public Guid? GroupId { get; init; }
}

public record FunRetroReactionDto
{
    public string Emoji { get; init; } = "";
    public int Count { get; init; }
    public bool Mine { get; init; }
}

public record FunRetroSessionSummaryDto
{
    public Guid Id { get; init; }
    public string? Title { get; init; }
    public string Phase { get; init; } = "lobby";
    public Guid CreatedByMemberId { get; init; }
    public string CreatedByName { get; init; } = "";
    public string? SprintName { get; init; }
    public int CardCount { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public record RetroColumnDto
{
    public string Key { get; init; } = "";
    public string Label { get; init; } = "";
    public string Color { get; init; } = "#64b5f6";
}

public record CreateFunRetroSessionRequest
{
    public string? Title { get; init; }
    public Guid? SprintId { get; init; }
    public List<RetroColumnDto>? Columns { get; init; }
    public string? IcebreakerQuestion { get; init; }
    public string? Theme { get; init; }
}

public record AddFunRetroCardRequest
{
    public string Column { get; init; } = "well";
    public string Text { get; init; } = "";
    public string? Color { get; init; }
}

public record UpdateRetroSettingsRequest
{
    public bool HideCardsOnAdd { get; init; }
    public bool ParticipationTracking { get; init; }
    public string? Theme { get; init; }
}
