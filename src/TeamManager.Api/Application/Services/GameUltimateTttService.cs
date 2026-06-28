using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.GameUltimateTtt;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Application.Services;

public class GameUltimateTttService(AppDbContext db)
{
    private static readonly JsonSerializerOptions _json = new() { PropertyNameCaseInsensitive = true };

    private static readonly int[][] WinLines =
    [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6],
    ];

    // ── Queries ──────────────────────────────────────────────────────────────────

    public async Task<List<GameUltimateTttSessionSummaryDto>> GetOpenSessionsAsync()
    {
        return await db.GameUltimateTttSessions
            .Include(s => s.CreatedBy)
            .Include(s => s.Participants)
            .Where(s => s.Status != "completed")
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new GameUltimateTttSessionSummaryDto
            {
                Id = s.Id,
                Title = s.Title,
                Status = s.Status,
                PlayerCount = s.Participants.Count,
                CreatedByName = s.CreatedBy != null ? s.CreatedBy.FirstName : "",
                CreatedAt = s.CreatedAt,
            })
            .ToListAsync();
    }

    public async Task<GameUltimateTttSessionDto?> GetSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.GameUltimateTttSessions
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        return session is null ? null : ToDto(session, memberId);
    }

    // ── Commands ─────────────────────────────────────────────────────────────────

    public async Task<GameUltimateTttSessionDto> CreateSessionAsync(Guid memberId, CreateGameUltimateTttSessionRequest req)
    {
        var member = await db.TeamMembers.FindAsync(memberId)
            ?? throw new InvalidOperationException("Member not found.");

        var session = new GameUltimateTttSession
        {
            Title = req.Title,
            CreatedByMemberId = memberId,
            CellsJson = JsonSerializer.Serialize(new int[81]),
            BigBoardJson = JsonSerializer.Serialize(new int[9]),
            IsAiGame = req.VsAi,
        };

        var human = new GameUltimateTttParticipant
        {
            SessionId = session.Id,
            MemberId = memberId,
            DisplayName = $"{member.FirstName} {member.LastName}".Trim(),
            Order = 0,
        };
        db.GameUltimateTttSessions.Add(session);
        db.GameUltimateTttParticipants.Add(human);

        if (req.VsAi)
        {
            var ai = new GameUltimateTttParticipant
            {
                SessionId = session.Id,
                MemberId = null,
                DisplayName = "AI",
                Order = 1,
                IsAi = true,
            };
            db.GameUltimateTttParticipants.Add(ai);
            session.Status = "inprogress";
            session.CurrentTurnMemberId = memberId; // human (X) goes first
        }
        else
        {
            session.Status = "waiting";
        }

        await db.SaveChangesAsync();
        return ToDto(session, memberId);
    }

    public async Task<(GameUltimateTttSessionDto? session, string? error)> JoinSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.GameUltimateTttSessions
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return (null, null);
        if (session.IsAiGame) return (null, "This is a single-player game vs AI.");
        if (session.Status == "completed") return (null, "Game is already over.");
        if (session.Participants.Any(p => p.MemberId == memberId)) return (null, "Already joined.");
        if (session.Participants.Count >= 2) return (null, "Game is full (2 players max).");

        var member = await db.TeamMembers.FindAsync(memberId)
            ?? throw new InvalidOperationException("Member not found.");

        db.GameUltimateTttParticipants.Add(new GameUltimateTttParticipant
        {
            SessionId = sessionId,
            MemberId = memberId,
            DisplayName = $"{member.FirstName} {member.LastName}".Trim(),
            Order = 1,
        });

        session.Status = "inprogress";
        session.CurrentTurnMemberId = session.CreatedByMemberId; // X goes first

        await db.SaveChangesAsync();
        _ = WebSocketMiddleware.BroadcastAsync("game_ultimate_ttt_update", new { sessionId });

        var updated = await db.GameUltimateTttSessions
            .Include(s => s.Participants)
            .FirstAsync(s => s.Id == sessionId);

        return (ToDto(updated, memberId), null);
    }

    public async Task<(GameUltimateTttSessionDto? session, string? error)> MakeMoveAsync(Guid sessionId, Guid memberId, GameUltimateTttMoveRequest req)
    {
        var session = await db.GameUltimateTttSessions
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return (null, null);
        if (session.Status != "inprogress") return (null, "Game is not in progress.");
        if (session.CurrentTurnMemberId != memberId) return (null, "Not your turn.");

        var participant = session.Participants.FirstOrDefault(p => p.MemberId == memberId);
        if (participant is null) return (null, "You are not in this game.");

        var error = ApplyMove(session, participant, req.Position);
        if (error is not null) return (null, error);

        // If vs AI and game still going, let AI move immediately
        if (session.IsAiGame && session.Status == "inprogress")
        {
            var aiParticipant = session.Participants.First(p => p.IsAi);
            var cells = JsonSerializer.Deserialize<int[]>(session.CellsJson, _json) ?? new int[81];
            var bigBoard = JsonSerializer.Deserialize<int[]>(session.BigBoardJson, _json) ?? new int[9];
            var aiPos = ChooseAiMove(cells, bigBoard, session.NextBoardIndex, aiMark: 2);
            ApplyMove(session, aiParticipant, aiPos);
        }

        await db.SaveChangesAsync();
        _ = WebSocketMiddleware.BroadcastAsync("game_ultimate_ttt_update", new { sessionId });

        return (ToDto(session, memberId), null);
    }

    // ── Move application (shared by human and AI) ────────────────────────────────

    private string? ApplyMove(GameUltimateTttSession session, GameUltimateTttParticipant participant, int pos)
    {
        if (pos < 0 || pos > 80) return "Invalid position.";

        var bigIdx = pos / 9;
        var smallIdx = pos % 9;

        var cells = JsonSerializer.Deserialize<int[]>(session.CellsJson, _json) ?? new int[81];
        var bigBoard = JsonSerializer.Deserialize<int[]>(session.BigBoardJson, _json) ?? new int[9];

        if (session.NextBoardIndex != -1 && bigIdx != session.NextBoardIndex)
            return "You must play in the highlighted board.";
        if (bigBoard[bigIdx] != 0) return "That board is already finished.";
        if (cells[pos] != 0) return "Cell is already taken.";

        int mark = participant.Order == 0 ? 1 : 2;
        cells[pos] = mark;

        var smallResult = CheckSmallBoard(cells, bigIdx);
        if (smallResult != 0)
        {
            bigBoard[bigIdx] = smallResult;
            if (smallResult == mark) participant.Score++;
        }

        int nextBoard = smallIdx;
        session.NextBoardIndex = bigBoard[nextBoard] == 0 ? nextBoard : -1;

        var metaWinner = CheckMetaBoard(bigBoard);
        if (metaWinner != 0 && metaWinner != 3)
        {
            session.Status = "completed";
            session.WinnerMemberId = participant.MemberId;
            participant.IsWinner = true;
        }
        else if (bigBoard.All(v => v != 0))
        {
            session.Status = "completed";
            // Tie-break by most small boards won (drawn boards don't count)
            var xCount = bigBoard.Count(v => v == 1);
            var oCount = bigBoard.Count(v => v == 2);
            if (xCount != oCount)
            {
                var winnerOrder = xCount > oCount ? 0 : 1;
                var winner = session.Participants.FirstOrDefault(p => p.Order == winnerOrder);
                if (winner != null) { session.WinnerMemberId = winner.MemberId; winner.IsWinner = true; }
            }
        }

        session.CellsJson = JsonSerializer.Serialize(cells);
        session.BigBoardJson = JsonSerializer.Serialize(bigBoard);

        if (session.Status == "inprogress")
        {
            var next = session.Participants.First(p => p.Id != participant.Id);
            session.CurrentTurnMemberId = next.MemberId; // null for AI turn — resolved before next human move
        }

        return null;
    }

    // ── AI ───────────────────────────────────────────────────────────────────────

    private int ChooseAiMove(int[] cells, int[] bigBoard, int nextBoardIndex, int aiMark)
    {
        var humanMark = aiMark == 1 ? 2 : 1;
        var valid = GetValidMoves(cells, bigBoard, nextBoardIndex);
        if (valid.Length == 0) return -1;

        int best = valid[0];
        int bestScore = int.MinValue;

        foreach (var pos in valid)
        {
            var score = ScoreMove(cells, bigBoard, pos, aiMark, humanMark);
            if (score > bestScore) { bestScore = score; best = pos; }
        }
        return best;
    }

    private int ScoreMove(int[] cells, int[] bigBoard, int pos, int aiMark, int humanMark)
    {
        int bigIdx = pos / 9;
        int smallIdx = pos % 9;
        int score = 0;

        // Simulate placing AI mark
        var simCells = (int[])cells.Clone();
        simCells[pos] = aiMark;
        var simBig = (int[])bigBoard.Clone();

        var smallResult = CheckSmallBoard(simCells, bigIdx);
        if (smallResult == aiMark)
        {
            simBig[bigIdx] = aiMark;
            score += 20;
            if (CheckMetaBoard(simBig) == aiMark) score += 500; // winning move
        }

        // Would opponent have won that board if they played here?
        var blockCells = (int[])cells.Clone();
        blockCells[pos] = humanMark;
        if (CheckSmallBoard(blockCells, bigIdx) == humanMark)
            score += 15; // blocking opponent's small-board win

        // Evaluate where we send the opponent
        int nextBoard = smallIdx;
        if (bigBoard[nextBoard] != 0)
        {
            score -= 2; // giving free choice is slightly bad
        }
        else
        {
            // Penalise sending them somewhere they have threats
            score -= CountThreats(cells, nextBoard, humanMark) * 4;
            // Reward sending them somewhere we have threats (we may have locked them out)
            score += CountThreats(cells, nextBoard, aiMark) * 2;

            // Penalise sending them to a board that wins the meta-game for them
            var tempBig = (int[])bigBoard.Clone();
            tempBig[nextBoard] = humanMark;
            if (CheckMetaBoard(tempBig) == humanMark) score -= 50;
        }

        // Positional preferences
        if (smallIdx == 4) score += 3;  // center of small board
        if (bigIdx == 4) score += 3;    // center meta-board

        score += Random.Shared.Next(-2, 3); // slight randomness
        return score;
    }

    private static int[] GetValidMoves(int[] cells, int[] bigBoard, int nextBoardIndex)
    {
        var moves = new List<int>();
        for (int pos = 0; pos < 81; pos++)
        {
            int bigIdx = pos / 9;
            if (cells[pos] != 0) continue;
            if (bigBoard[bigIdx] != 0) continue;
            if (nextBoardIndex != -1 && bigIdx != nextBoardIndex) continue;
            moves.Add(pos);
        }
        return [.. moves];
    }

    private static int CountThreats(int[] cells, int bigIdx, int mark)
    {
        int threats = 0;
        int offset = bigIdx * 9;
        foreach (var line in WinLines)
        {
            int marks = 0, empty = 0;
            foreach (var i in line)
            {
                var v = cells[offset + i];
                if (v == mark) marks++;
                else if (v == 0) empty++;
            }
            if (marks == 2 && empty == 1) threats++;
        }
        return threats;
    }

    // ── Game logic ────────────────────────────────────────────────────────────────

    private static int CheckSmallBoard(int[] cells, int bigIdx)
    {
        var offset = bigIdx * 9;
        foreach (var line in WinLines)
        {
            var v = cells[offset + line[0]];
            if (v != 0 && v == cells[offset + line[1]] && v == cells[offset + line[2]])
                return v;
        }
        if (Enumerable.Range(0, 9).All(i => cells[offset + i] != 0))
            return 3;
        return 0;
    }

    private static int CheckMetaBoard(int[] bigBoard)
    {
        foreach (var line in WinLines)
        {
            var v = bigBoard[line[0]];
            if (v != 0 && v != 3 && v == bigBoard[line[1]] && v == bigBoard[line[2]])
                return v;
        }
        if (bigBoard.All(v => v != 0)) return 3;
        return 0;
    }

    // ── DTO mapping ───────────────────────────────────────────────────────────────

    private static GameUltimateTttSessionDto ToDto(GameUltimateTttSession session, Guid memberId)
    {
        var participants = session.Participants.OrderBy(p => p.Order).ToList();
        var displayNames = GameNameHelper.DeduplicateFirstNames(participants.Select(p => p.DisplayName).ToArray());

        return new GameUltimateTttSessionDto
        {
            Id = session.Id,
            Title = session.Title,
            Status = session.Status,
            CreatedByMemberId = session.CreatedByMemberId,
            IsCreator = session.CreatedByMemberId == memberId,
            IsAiGame = session.IsAiGame,
            CreatedAt = session.CreatedAt,
            Cells = JsonSerializer.Deserialize<int[]>(session.CellsJson) ?? new int[81],
            BigBoard = JsonSerializer.Deserialize<int[]>(session.BigBoardJson) ?? new int[9],
            CurrentTurnMemberId = session.CurrentTurnMemberId,
            NextBoardIndex = session.NextBoardIndex,
            WinnerMemberId = session.WinnerMemberId,
            Participants = participants
                .Select((p, i) => new GameUltimateTttParticipantDto
                {
                    Id = p.Id,
                    MemberId = p.MemberId,
                    DisplayName = displayNames[i],
                    Order = p.Order,
                    Score = p.Score,
                    IsWinner = p.IsWinner,
                    IsAi = p.IsAi,
                    IsMe = p.MemberId == memberId,
                })
                .ToList(),
        };
    }
}
