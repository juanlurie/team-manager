using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.GameConnections;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Application.Services;

public class GameConnectionsService(AppDbContext db)
{
    private static readonly JsonSerializerOptions _json = new() { PropertyNameCaseInsensitive = true };

    public async Task<List<GameConnectionsSessionSummaryDto>> GetOpenSessionsAsync()
    {
        return await db.GameConnectionsSessions
            .Include(s => s.CreatedByMember)
            .Include(s => s.Participants)
            .Where(s => s.Status != GameConnectionsStatus.Won && s.Status != GameConnectionsStatus.Lost)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new GameConnectionsSessionSummaryDto
            {
                Id = s.Id,
                Title = s.Title,
                Status = s.Status.ToString().ToLower(),
                PlayerCount = s.Participants.Count,
                CreatedByName = s.CreatedByMember != null ? s.CreatedByMember.FirstName : "",
                CreatedAt = s.CreatedAt,
            })
            .ToListAsync();
    }

    public async Task<GameConnectionsSessionDto?> GetSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.GameConnectionsSessions
            .Include(s => s.Participants).ThenInclude(p => p.Member)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return null;
        return ToDto(session, memberId, lastResult: null);
    }

    public async Task<GameConnectionsSessionDto> CreateSessionAsync(Guid memberId, CreateGameConnectionsSessionRequest req)
    {
        var member = await db.TeamMembers.FindAsync(memberId)
            ?? throw new InvalidOperationException("Member not found.");

        var session = new GameConnectionsSession
        {
            Title = req.Title,
            CreatedByMemberId = memberId,
        };

        var participant = new GameConnectionsParticipant
        {
            SessionId = session.Id,
            MemberId = memberId,
            DisplayName = $"{member.FirstName} {member.LastName}".Trim(),
        };

        db.GameConnectionsSessions.Add(session);
        db.GameConnectionsParticipants.Add(participant);
        await db.SaveChangesAsync();

        return ToDto(session, memberId, lastResult: null);
    }

    public async Task<(GameConnectionsSessionDto? session, string? error)> JoinSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.GameConnectionsSessions
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return (null, null);
        if (session.Status != GameConnectionsStatus.Waiting) return (null, "Game has already started.");
        if (session.Participants.Any(p => p.MemberId == memberId)) return (null, "Already joined.");

        var member = await db.TeamMembers.FindAsync(memberId)
            ?? throw new InvalidOperationException("Member not found.");

        db.GameConnectionsParticipants.Add(new GameConnectionsParticipant
        {
            SessionId = sessionId,
            MemberId = memberId,
            DisplayName = $"{member.FirstName} {member.LastName}".Trim(),
        });
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("connections_update", new { sessionId });

        var updated = await db.GameConnectionsSessions
            .Include(s => s.Participants).ThenInclude(p => p.Member)
            .FirstAsync(s => s.Id == sessionId);

        return (ToDto(updated, memberId, lastResult: null), null);
    }

    public async Task<(GameConnectionsSessionDto? session, string? error)> StartSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.GameConnectionsSessions
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return (null, null);
        if (session.CreatedByMemberId != memberId) return (null, "Only the creator can start.");
        if (session.Status != GameConnectionsStatus.Waiting) return (null, "Game is not in waiting state.");

        var puzzleIndex = Random.Shared.Next(GameConnectionsWordBank.Puzzles.Length);
        var puzzle = GameConnectionsWordBank.Puzzles[puzzleIndex];

        session.PuzzleIndex = puzzleIndex;
        session.PuzzleJson = JsonSerializer.Serialize(puzzle);
        session.Status = GameConnectionsStatus.InProgress;
        session.StartedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync();
        _ = WebSocketMiddleware.BroadcastAsync("connections_update", new { sessionId });

        var updated = await db.GameConnectionsSessions
            .Include(s => s.Participants).ThenInclude(p => p.Member)
            .FirstAsync(s => s.Id == sessionId);

        return (ToDto(updated, memberId, lastResult: null), null);
    }

    public async Task<(GameConnectionsSessionDto? session, string? error)> SubmitGuessAsync(
        Guid sessionId, Guid memberId, SubmitConnectionsGuessRequest req)
    {
        if (req.WordIndices is null || req.WordIndices.Distinct().Count() != 4)
            return (null, "Select exactly 4 words.");
        if (req.WordIndices.Any(i => i < 0 || i > 15))
            return (null, "Invalid word selection.");

        var normalizedGuess = req.WordIndices.OrderBy(i => i).ToArray();

        for (var attempt = 0; attempt < 2; attempt++)
        {
            var session = await db.GameConnectionsSessions
                .Include(s => s.Participants).ThenInclude(p => p.Member)
                .FirstOrDefaultAsync(s => s.Id == sessionId);

            if (session is null) return (null, null);
            if (session.Status != GameConnectionsStatus.InProgress) return (null, "Game is not in progress.");
            if (!session.Participants.Any(p => p.MemberId == memberId)) return (null, "Join the session first.");

            var puzzle = JsonSerializer.Deserialize<ConnectionsPuzzle>(session.PuzzleJson, _json)!;
            var solved = JsonSerializer.Deserialize<List<int>>(session.SolvedGroupsJson, _json) ?? [];
            var wrongPrior = JsonSerializer.Deserialize<List<int[]>>(session.WrongGuessesJson, _json) ?? [];

            if (wrongPrior.Any(w => w.SequenceEqual(normalizedGuess)))
                return (null, "You've already tried that combination.");

            var flatWords = puzzle.Groups
                .SelectMany((g, gi) => g.Words.Select(w => (word: w, groupIndex: gi)))
                .ToArray();
            var guessedGroupIndices = req.WordIndices.Select(i => flatWords[i].groupIndex).ToList();

            if (guessedGroupIndices.Any(gi => solved.Contains(gi)))
                return (null, "One or more of those words is already solved.");

            var counts = guessedGroupIndices.GroupBy(x => x).ToDictionary(g => g.Key, g => g.Count());
            var isExactMatch = counts.Count == 1;
            var isOneAway = counts.Count == 2 && counts.Values.Any(c => c == 3);

            string resultKind;
            if (isExactMatch)
            {
                solved.Add(counts.Keys.First());
                session.SolvedGroupsJson = JsonSerializer.Serialize(solved);
                resultKind = "correct";
            }
            else
            {
                wrongPrior.Add(normalizedGuess);
                session.WrongGuessesJson = JsonSerializer.Serialize(wrongPrior);
                session.MistakesUsed++;
                resultKind = isOneAway ? "one_away" : "wrong";
            }

            if (solved.Count == 4)
            {
                session.Status = GameConnectionsStatus.Won;
                session.CompletedAt = DateTimeOffset.UtcNow;
            }
            else if (session.MistakesUsed >= 4)
            {
                session.Status = GameConnectionsStatus.Lost;
                session.CompletedAt = DateTimeOffset.UtcNow;
            }

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException) when (attempt == 0)
            {
                // Another participant's guess landed first and changed the shared state
                // (MistakesUsed/SolvedGroupsJson) underneath us -- reload fresh state and
                // re-run validation/mutation once against the current position.
                db.ChangeTracker.Clear();
                continue;
            }

            _ = WebSocketMiddleware.BroadcastAsync("connections_update", new { sessionId });
            return (ToDto(session, memberId, lastResult: resultKind), null);
        }

        return (null, "Please try again.");
    }

    private static GameConnectionsSessionDto ToDto(GameConnectionsSession session, Guid memberId, string? lastResult)
    {
        var orderedParticipants = session.Participants.OrderBy(p => p.JoinedAt).ToList();
        var displayNames = GameNameHelper.DeduplicateFirstNames(orderedParticipants.Select(p => p.DisplayName).ToArray());
        var myParticipant = session.Participants.FirstOrDefault(p => p.MemberId == memberId);

        var words = Array.Empty<string>();
        var groups = new List<GameConnectionsGroupDto>();
        var solved = new List<int>();

        if (!string.IsNullOrEmpty(session.PuzzleJson))
        {
            var puzzle = JsonSerializer.Deserialize<ConnectionsPuzzle>(session.PuzzleJson, _json)!;
            words = puzzle.Groups.SelectMany(g => g.Words).ToArray();
            solved = JsonSerializer.Deserialize<List<int>>(session.SolvedGroupsJson, _json) ?? [];

            var revealAll = session.Status == GameConnectionsStatus.Lost;
            for (var gi = 0; gi < puzzle.Groups.Length; gi++)
            {
                var isSolved = solved.Contains(gi);
                if (isSolved || revealAll)
                {
                    groups.Add(new GameConnectionsGroupDto
                    {
                        GroupIndex = gi,
                        Difficulty = (int)puzzle.Groups[gi].Difficulty,
                        Label = puzzle.Groups[gi].Label,
                        Words = puzzle.Groups[gi].Words,
                        WasRevealed = !isSolved && revealAll,
                    });
                }
            }
            // Solve order first (oldest first), then any revealed-on-loss groups after.
            groups = groups.OrderBy(g => solved.Contains(g.GroupIndex) ? solved.IndexOf(g.GroupIndex) : int.MaxValue)
                            .ThenBy(g => g.GroupIndex)
                            .ToList();
        }

        return new GameConnectionsSessionDto
        {
            Id = session.Id,
            Title = session.Title,
            Status = session.Status.ToString().ToLower(),
            Words = words,
            SolvedGroups = groups,
            MistakesUsed = session.MistakesUsed,
            CreatedByMemberId = session.CreatedByMemberId,
            IsCreator = session.CreatedByMemberId == memberId,
            MyParticipantId = myParticipant?.Id,
            CreatedAt = session.CreatedAt,
            Participants = orderedParticipants.Select((p, i) => new GameConnectionsParticipantDto
            {
                Id = p.Id,
                MemberId = p.MemberId,
                DisplayName = displayNames[i],
                IsMe = p.MemberId == memberId,
            }).ToList(),
            LastGuessResult = lastResult,
        };
    }
}
