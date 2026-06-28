namespace TeamManager.Api.Domain.Entities;

// One submitted guess. ResultJson is a pre-computed array of "correct"/"present"/"absent" per
// letter (computed once at submit time) so re-fetching a session never needs to recompute it or
// risk leaking the secret word via client-side comparison logic.
public class WordleGuess
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public Guid MemberId { get; set; }
    public int GuessIndex { get; set; }
    public string Word { get; set; } = "";
    public string ResultJson { get; set; } = "[]";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public WordleSession? Session { get; set; }
}
