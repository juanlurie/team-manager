namespace TeamManager.Api.Application.DTOs.ScrumPoker;

public record ScrumPokerSessionDto(
    Guid Id,
    string Title,
    string? StoryTitle,
    string? Description,
    string Scale,
    bool Revealed,
    DateTimeOffset CreatedAt,
    DateTimeOffset? RevealedAt,
    string CreatedByMemberName,
    int VoteCount
);

public record ScrumPokerVoteDto(
    Guid Id,
    Guid MemberId,
    string MemberName,
    string? Value,
    DateTimeOffset VotedAt
);

public record ScrumPokerSessionDetailDto(
    Guid Id,
    string Title,
    string? StoryTitle,
    string? Description,
    string Scale,
    bool Revealed,
    DateTimeOffset CreatedAt,
    DateTimeOffset? RevealedAt,
    string CreatedByMemberName,
    List<ScrumPokerVoteDto> Votes
);

public record CreateScrumPokerSessionRequest(
    string Title,
    string? StoryTitle,
    string? Description,
    string Scale = "Fibonacci"
);

public record CastScrumPokerVoteRequest(
    string Value
);

public enum ScrumPokerScale
{
    Fibonacci,
    TShirt,
    Linear,
    PowersOfTwo
}
