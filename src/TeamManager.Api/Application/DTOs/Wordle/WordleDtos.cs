using TeamManager.Api.Application.Services;

namespace TeamManager.Api.Application.DTOs.Wordle;

public record WordleSessionSummaryDto
{
    public Guid Id { get; init; }
    public string? Title { get; init; }
    public string Status { get; init; } = string.Empty;
    public string CreatedByName { get; init; } = string.Empty;
    public int ParticipantCount { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public record WordleGuessResultDto
{
    public string Word { get; init; } = string.Empty;
    // Per-letter: "correct" | "present" | "absent"
    public List<string> Letters { get; init; } = [];
}

public record WordleParticipantDto
{
    public Guid MemberId { get; init; }
    public string MemberName { get; init; } = string.Empty;
    public string Status { get; init; } = "Playing";
    public int GuessCount { get; init; }
}

public record WordleSessionDto
{
    public Guid Id { get; init; }
    public string? Title { get; init; }
    public string Status { get; init; } = string.Empty;
    public bool IsCreator { get; init; }
    public bool IsParticipant { get; init; }
    public Guid CurrentMemberId { get; init; }
    public int WordLength { get; init; } = WordleWordBank.WordLength;
    public int MaxGuesses { get; init; } = WordleWordBank.MaxGuesses;
    public List<WordleParticipantDto> Participants { get; init; } = [];

    public string MyStatus { get; init; } = "Playing";
    public List<WordleGuessResultDto> MyGuesses { get; init; } = [];
    // Populated only once MyStatus is Won/Lost, to reveal the answer.
    public string? RevealedWord { get; init; }
}

public record CreateWordleSessionRequest(string? Title);

public record SubmitWordleGuessRequest(string Word);
