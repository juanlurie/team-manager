namespace TeamManager.Api.Application.DTOs.Poll;

public record PollSummaryDto
{
    public Guid Id { get; init; }
    public string Question { get; init; } = string.Empty;
    public string CreatedByName { get; init; } = string.Empty;
    public int OptionCount { get; init; }
    public int TotalVotes { get; init; }
    public bool IsClosed { get; init; }
    public bool HideResultsUntilClosed { get; init; }
    public DateTimeOffset? ScheduledCloseAt { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public record PollOptionResultDto
{
    public Guid Id { get; init; }
    public string Text { get; init; } = string.Empty;
    public int VoteCount { get; init; }
    public double Percentage { get; init; }
}

public record PollDetailDto
{
    public Guid Id { get; init; }
    public string Question { get; init; } = string.Empty;
    public string CreatedByName { get; init; } = string.Empty;
    public bool IsClosed { get; init; }
    public bool IsCreator { get; init; }
    public bool HideResultsUntilClosed { get; init; }
    public bool ResultsVisible { get; init; }
    public bool IsPeekingAsCreator { get; init; }
    public DateTimeOffset? ScheduledCloseAt { get; init; }
    public int TotalVotes { get; init; }
    public Guid? MyOptionId { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public List<PollOptionResultDto> Options { get; init; } = [];
}

public record CreatePollRequest(string Question, List<string> Options, bool HideResultsUntilClosed = false, DateTimeOffset? ScheduledCloseAt = null);

public record CastPollVoteRequest(Guid OptionId);

public record UpdatePollSettingsRequest(bool HideResultsUntilClosed, DateTimeOffset? ScheduledCloseAt);
