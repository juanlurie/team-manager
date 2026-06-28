using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Wordle;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Application.Services;

// Host-created session like Quiz Game's Millionaire mode: everyone who joins gets their own
// independent 6 guesses against the same secret word, picked once when the host starts the
// session. Guesses are private between players -- the session view only ever exposes other
// participants' guess COUNT and status, never their actual guessed words, so nobody can pick up
// hints about the answer from someone else's attempts.
public class WordleService(AppDbContext db, WordleWordGeneratorService wordGenerator, WordleRoyaleService royale)
{
    public async Task<List<WordleSessionSummaryDto>> GetOpenSessionsAsync()
    {
        var sessions = await db.WordleSessions
            .Include(s => s.CreatedByMember)
            .Include(s => s.Participants)
            .Where(s => s.Status != WordleSessionStatus.Completed)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        return sessions.Select(s => new WordleSessionSummaryDto
        {
            Id = s.Id,
            Title = s.Title,
            Status = s.Status.ToString(),
            CreatedByName = s.CreatedByMember != null ? $"{s.CreatedByMember.FirstName} {s.CreatedByMember.LastName}" : "Someone",
            ParticipantCount = s.Participants.Count,
            CreatedAt = s.CreatedAt
        }).ToList();
    }

    public async Task<WordleSessionDto> CreateSessionAsync(Guid memberId, string? title)
    {
        var (word, isAiGenerated) = await wordGenerator.GenerateWordAsync();
        var session = new WordleSession
        {
            CreatedByMemberId = memberId,
            Title = title,
            Word = word,
            IsAiGenerated = isAiGenerated,
        };
        db.WordleSessions.Add(session);
        await db.SaveChangesAsync();

        db.WordleParticipants.Add(new WordleParticipant { SessionId = session.Id, MemberId = memberId });
        await db.SaveChangesAsync();

        return await GetSessionAsync(session.Id, memberId);
    }

    public async Task<WordleSessionDto> JoinSessionAsync(Guid memberId, Guid sessionId)
    {
        var session = await db.WordleSessions.FindAsync(sessionId)
            ?? throw new KeyNotFoundException("Session not found.");
        if (session.Status == WordleSessionStatus.Completed)
            throw new InvalidOperationException("This session has already finished.");

        var existing = await db.WordleParticipants.AnyAsync(p => p.SessionId == sessionId && p.MemberId == memberId);
        if (!existing)
        {
            db.WordleParticipants.Add(new WordleParticipant { SessionId = sessionId, MemberId = memberId });
            await db.SaveChangesAsync();
            _ = WebSocketMiddleware.BroadcastAsync("wordle_progress", new { sessionId, memberId });
        }

        return await GetSessionAsync(sessionId, memberId);
    }

    public async Task<WordleSessionDto> StartSessionAsync(Guid memberId, Guid sessionId)
    {
        var session = await db.WordleSessions.FindAsync(sessionId)
            ?? throw new KeyNotFoundException("Session not found.");
        if (session.CreatedByMemberId != memberId)
            throw new InvalidOperationException("Only the host can start this session.");
        if (session.Status != WordleSessionStatus.Waiting)
            throw new InvalidOperationException("This session has already started.");

        session.Status = WordleSessionStatus.InProgress;
        session.StartedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("wordle_progress", new { sessionId });
        return await GetSessionAsync(sessionId, memberId);
    }

    public async Task<WordleSessionDto> SubmitGuessAsync(Guid memberId, Guid sessionId, string word)
    {
        var session = await db.WordleSessions.FindAsync(sessionId)
            ?? throw new KeyNotFoundException("Session not found.");
        if (session.Status != WordleSessionStatus.InProgress)
            throw new InvalidOperationException("This session isn't in progress.");

        var participant = await db.WordleParticipants.FirstOrDefaultAsync(p => p.SessionId == sessionId && p.MemberId == memberId)
            ?? throw new InvalidOperationException("Join the session before guessing.");
        if (participant.Status != WordleParticipantStatus.Playing)
            throw new InvalidOperationException("Your game is already over.");

        var normalized = (word ?? "").Trim().ToUpperInvariant();
        if (normalized.Length != WordleWordBank.WordLength || !normalized.All(char.IsAsciiLetterUpper))
            throw new InvalidOperationException($"Guess must be exactly {WordleWordBank.WordLength} letters.");
        if (!WordleWordBank.IsValidGuess(normalized))
            throw new InvalidOperationException("Not in word list.");

        var guessIndex = participant.GuessCount;
        var letters = ScoreGuess(normalized, session.Word);
        db.WordleGuesses.Add(new WordleGuess
        {
            SessionId = sessionId,
            MemberId = memberId,
            GuessIndex = guessIndex,
            Word = normalized,
            ResultJson = JsonSerializer.Serialize(letters)
        });

        participant.GuessCount = guessIndex + 1;
        var solved = normalized == session.Word;
        if (solved)
        {
            participant.Status = WordleParticipantStatus.Won;
            participant.FinishedAt = DateTimeOffset.UtcNow;
        }
        else if (participant.GuessCount >= WordleWordBank.MaxGuesses)
        {
            participant.Status = WordleParticipantStatus.Lost;
            participant.FinishedAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync();
        _ = WebSocketMiddleware.BroadcastAsync("wordle_progress", new { sessionId, memberId });

        await TryCompleteSessionIfDoneAsync(session);
        return await GetSessionAsync(sessionId, memberId);
    }

    public async Task<WordleSessionDto> GetSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.WordleSessions
            .Include(s => s.Participants).ThenInclude(p => p.Member)
            .FirstOrDefaultAsync(s => s.Id == sessionId)
            ?? throw new KeyNotFoundException("Session not found.");

        var me = session.Participants.FirstOrDefault(p => p.MemberId == memberId);

        var myGuessRows = me is null ? [] : await db.WordleGuesses
            .Where(g => g.SessionId == sessionId && g.MemberId == memberId)
            .OrderBy(g => g.GuessIndex)
            .ToListAsync();
        var myGuesses = myGuessRows.Select(g => new WordleGuessResultDto
        {
            Word = g.Word,
            Letters = JsonSerializer.Deserialize<List<string>>(g.ResultJson) ?? []
        }).ToList();

        DTOs.Wordle.MyRoyaleResultDto? myRoyaleResult = null;
        if (session.Status == WordleSessionStatus.Completed && me is not null)
            myRoyaleResult = await royale.GetSessionResultForMemberAsync(session.Id, memberId);

        return new WordleSessionDto
        {
            Id = session.Id,
            Title = session.Title,
            Status = session.Status.ToString(),
            IsCreator = session.CreatedByMemberId == memberId,
            IsParticipant = me is not null,
            CurrentMemberId = memberId,
            Participants = session.Participants.Select(p => new WordleParticipantDto
            {
                MemberId = p.MemberId,
                MemberName = p.Member != null ? $"{p.Member.FirstName} {p.Member.LastName}" : "Someone",
                Status = p.Status.ToString(),
                GuessCount = p.GuessCount
            }).ToList(),
            MyStatus = me?.Status.ToString() ?? "Playing",
            MyGuesses = myGuesses,
            RevealedWord = me is { Status: not WordleParticipantStatus.Playing } ? session.Word : null,
            RevealedWordIsAiGenerated = me is { Status: not WordleParticipantStatus.Playing } ? session.IsAiGenerated : null,
            MyRoyaleResult = myRoyaleResult
        };
    }

    // The session completes once every participant has reached a terminal state (Won/Lost).
    // Someone who joined but never guessed stays Playing indefinitely -- same rationale as
    // Millionaire mode: no global timer forcing the issue, they may come back later.
    private async Task TryCompleteSessionIfDoneAsync(WordleSession session)
    {
        var participants = await db.WordleParticipants.Where(p => p.SessionId == session.Id).ToListAsync();
        if (participants.Count == 0) return;
        var allDone = participants.All(p => p.Status != WordleParticipantStatus.Playing);
        if (!allDone) return;

        var completedAt = DateTimeOffset.UtcNow;
        var claimed = await db.WordleSessions
            .Where(s => s.Id == session.Id && s.Status == WordleSessionStatus.InProgress)
            .ExecuteUpdateAsync(s => s
                .SetProperty(x => x.Status, WordleSessionStatus.Completed)
                .SetProperty(x => x.CompletedAt, completedAt));
        if (claimed == 0) return;

        // ExecuteUpdateAsync bypasses the change tracker -- without this, the in-memory `session`
        // (and the response built from it later in this same request) would still report the
        // stale "InProgress" status it had before this call.
        session.Status = WordleSessionStatus.Completed;
        session.CompletedAt = completedAt;

        await AwardLeaderboardPointsAsync(session, participants);
        await royale.ProcessSessionAsync(session, participants);
        _ = WebSocketMiddleware.BroadcastAsync("wordle_completed", new { sessionId = session.Id });
    }

    private async Task AwardLeaderboardPointsAsync(WordleSession session, List<WordleParticipant> participants)
    {
        var sessionLabel = !string.IsNullOrWhiteSpace(session.Title) ? session.Title : session.CreatedAt.ToString("MMM d, yyyy");
        var winners = participants.Where(p => p.Status == WordleParticipantStatus.Won).ToList();

        foreach (var p in winners)
        {
            db.PointAwards.Add(new PointAward
            {
                TeamMemberId = p.MemberId,
                Points = Math.Max(1, WordleWordBank.MaxGuesses - p.GuessCount + 1),
                Reason = $"Wordle — {sessionLabel}",
                AwardedAt = DateTimeOffset.UtcNow
            });
        }

        if (winners.Count > 0)
        {
            var fewestGuesses = winners.Min(p => p.GuessCount);
            var achievement = await db.Achievements.FirstOrDefaultAsync(a => a.Key == "wordle-champion");
            if (achievement is not null)
            {
                foreach (var winner in winners.Where(p => p.GuessCount == fewestGuesses))
                {
                    db.MemberAchievements.Add(new MemberAchievement
                    {
                        TeamMemberId = winner.MemberId,
                        AchievementId = achievement.Id,
                        AwardedAt = DateTimeOffset.UtcNow,
                        Note = sessionLabel
                    });
                }
            }
        }

        await db.SaveChangesAsync();
    }

    // Standard Wordle duplicate-letter-aware scoring: exact-position matches are claimed first,
    // then remaining guessed letters consume from whatever's left of the secret word's letter
    // pool -- so guessing a repeated letter only lights up "present" as many times as it actually
    // appears unmatched in the secret word, not once per occurrence in the guess.
    private static List<string> ScoreGuess(string guess, string secret)
    {
        var result = new string[guess.Length];
        var remaining = new Dictionary<char, int>();
        for (var i = 0; i < secret.Length; i++)
        {
            if (guess[i] == secret[i]) result[i] = "correct";
            else remaining[secret[i]] = remaining.GetValueOrDefault(secret[i]) + 1;
        }
        for (var i = 0; i < guess.Length; i++)
        {
            if (result[i] is not null) continue;
            var c = guess[i];
            if (remaining.TryGetValue(c, out var count) && count > 0)
            {
                result[i] = "present";
                remaining[c] = count - 1;
            }
            else
            {
                result[i] = "absent";
            }
        }
        return result.ToList()!;
    }
}
