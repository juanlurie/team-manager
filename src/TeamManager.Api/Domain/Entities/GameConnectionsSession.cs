namespace TeamManager.Api.Domain.Entities;

public enum GameConnectionsStatus { Waiting, InProgress, Won, Lost }

// Shared collaborative board -- one set of guesses per session, not per-participant.
// Anyone who joins can submit a guess against the same mutable state.
public class GameConnectionsSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string? Title { get; set; }
    public GameConnectionsStatus Status { get; set; } = GameConnectionsStatus.Waiting;

    // Picked once in StartSessionAsync -- PuzzleJson is a full snapshot (not just the index)
    // so a live session is immune to future edits/redeploys of GameConnectionsWordBank.
    public int PuzzleIndex { get; set; }
    public string PuzzleJson { get; set; } = "";

    public string SolvedGroupsJson { get; set; } = "[]"; // ordered group indices, solve order = reveal order
    public string WrongGuessesJson { get; set; } = "[]"; // list of int[4] already-tried-wrong word-index sets
    public int MistakesUsed { get; set; }

    public Guid CreatedByMemberId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }

    public TeamMember? CreatedByMember { get; set; }
    public ICollection<GameConnectionsParticipant> Participants { get; set; } = [];
}
