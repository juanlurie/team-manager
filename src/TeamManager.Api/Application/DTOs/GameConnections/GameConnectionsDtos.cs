namespace TeamManager.Api.Application.DTOs.GameConnections;

public record GameConnectionsSessionSummaryDto
{
    public Guid Id { get; init; }
    public string? Title { get; init; }
    public string Status { get; init; } = "waiting";
    public int PlayerCount { get; init; }
    public string CreatedByName { get; init; } = "";
    public DateTimeOffset CreatedAt { get; init; }
}

public record GameConnectionsParticipantDto
{
    public Guid Id { get; init; }
    public Guid MemberId { get; init; }
    public string DisplayName { get; init; } = "";
    public bool IsMe { get; init; }
}

public record GameConnectionsGroupDto
{
    public int GroupIndex { get; init; }
    public int Difficulty { get; init; } // 0=yellow 1=green 2=blue 3=purple
    // Label/Words are only populated once a group is solved (or the game is lost, in which
    // case every group is included) -- see GameConnectionsService.ToDto.
    public string? Label { get; init; }
    public string[]? Words { get; init; }
    public bool WasRevealed { get; init; } // true if shown only because the game was lost, not solved
}

public record GameConnectionsSessionDto
{
    public Guid Id { get; init; }
    public string? Title { get; init; }
    public string Status { get; init; } = "waiting";
    // Full flat 16-word list in stable server order -- indices stay meaningful for the life
    // of the session regardless of solve order, so the client's guess requests always refer
    // to the same word by the same index.
    public string[] Words { get; init; } = [];
    public List<GameConnectionsGroupDto> SolvedGroups { get; init; } = [];
    public int MistakesUsed { get; init; }
    public Guid CreatedByMemberId { get; init; }
    public bool IsCreator { get; init; }
    public Guid? MyParticipantId { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public List<GameConnectionsParticipantDto> Participants { get; init; } = [];
    // Set only on the response to the request that triggered it -- not persisted/broadcast,
    // just one-shot feedback for the submitting client.
    public string? LastGuessResult { get; init; } // "correct" | "one_away" | "wrong" | null
}

public record CreateGameConnectionsSessionRequest
{
    public string? Title { get; init; }
}

public record SubmitConnectionsGuessRequest
{
    public List<int> WordIndices { get; init; } = [];
}
