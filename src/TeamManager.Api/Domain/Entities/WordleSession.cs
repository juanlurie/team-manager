namespace TeamManager.Api.Domain.Entities;

public enum WordleSessionStatus
{
    Waiting,
    InProgress,
    Completed
}

// Host-created session like Quiz Game: everyone who joins gets their own independent 6 guesses
// against the same secret word, picked once when the host starts the session.
public class WordleSession
{
    public Guid Id { get; set; }
    public Guid CreatedByMemberId { get; set; }
    public string? Title { get; set; }
    public string Word { get; set; } = "";
    public WordleSessionStatus Status { get; set; } = WordleSessionStatus.Waiting;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }

    public TeamMember? CreatedByMember { get; set; }
    public ICollection<WordleParticipant> Participants { get; set; } = [];
    public ICollection<WordleGuess> Guesses { get; set; } = [];
}
