namespace TeamManager.Api.Application.DTOs.Sprint;

public record IcebreakerAnswerDto
{
    public Guid MemberId { get; init; }
    public string MemberName { get; init; } = string.Empty;
    public string Answer { get; init; } = string.Empty;
}

public record RetroTimerRequest(int TotalSeconds, string? StartedAt, string? PausedAt, int ElapsedBeforePause);

public record IcebreakerAnswerRequest(string Answer);
