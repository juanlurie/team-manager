using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.GameThrees;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Application.Services;

public class GameThreesService(AppDbContext db)
{
    private static readonly JsonSerializerOptions _json = new() { PropertyNameCaseInsensitive = true };

    public async Task<List<GameThreesSessionSummaryDto>> GetOpenSessionsAsync()
    {
        return await db.GameThreesSessions
            .Include(s => s.CreatedBy)
            .Include(s => s.Participants)
            .Where(s => s.Status == "inprogress")
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new GameThreesSessionSummaryDto
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

    public async Task<GameThreesSessionDto?> GetSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.GameThreesSessions
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return null;
        return ToDto(session, memberId);
    }

    public async Task<GameThreesSessionDto> CreateSessionAsync(Guid memberId, CreateGameThreesSessionRequest req)
    {
        var member = await db.TeamMembers.FindAsync(memberId)
            ?? throw new InvalidOperationException("Member not found.");

        var session = new GameThreesSession
        {
            Title = req.Title,
            CreatedByMemberId = memberId,
            Status = "inprogress",
        };

        var (board, nextTile) = InitialBoard();
        var participant = new GameThreesParticipant
        {
            SessionId = session.Id,
            MemberId = memberId,
            DisplayName = $"{member.FirstName} {member.LastName}".Trim(),
            Order = 0,
            BoardJson = JsonSerializer.Serialize(board),
            NextTile = nextTile,
        };

        db.GameThreesSessions.Add(session);
        db.GameThreesParticipants.Add(participant);
        await db.SaveChangesAsync();

        return ToDto(session, memberId);
    }

    public async Task<(GameThreesSessionDto? session, string? error)> JoinSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.GameThreesSessions
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return (null, null);
        if (session.Status == "completed") return (null, "Game is already over.");
        if (session.Participants.Any(p => p.MemberId == memberId)) return (null, "Already joined.");
        if (session.Participants.Count >= 6) return (null, "Session is full (max 6 players).");

        var member = await db.TeamMembers.FindAsync(memberId)
            ?? throw new InvalidOperationException("Member not found.");

        var (board, nextTile) = InitialBoard();
        var participant = new GameThreesParticipant
        {
            SessionId = sessionId,
            MemberId = memberId,
            DisplayName = $"{member.FirstName} {member.LastName}".Trim(),
            Order = session.Participants.Count,
            BoardJson = JsonSerializer.Serialize(board),
            NextTile = nextTile,
        };

        db.GameThreesParticipants.Add(participant);
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("game_threes_update", new { sessionId });

        var updated = await db.GameThreesSessions
            .Include(s => s.Participants)
            .FirstAsync(s => s.Id == sessionId);

        return (ToDto(updated, memberId), null);
    }

    public async Task<(GameThreesSessionDto? session, string? error)> MakeMoveAsync(Guid sessionId, Guid memberId, GameThreesMoveRequest req)
    {
        var session = await db.GameThreesSessions
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return (null, null);
        if (session.Status != "inprogress") return (null, "Game is not in progress.");

        var participant = session.Participants.FirstOrDefault(p => p.MemberId == memberId);
        if (participant is null) return (null, "You are not in this game.");
        if (participant.IsGameOver) return (null, "Your game is already over.");

        var direction = req.Direction.ToLower();
        if (direction is not ("left" or "right" or "up" or "down"))
            return (null, "Invalid direction.");

        var board = JsonSerializer.Deserialize<int[]>(participant.BoardJson, _json) ?? new int[16];
        var (newBoard, points, changed) = ApplyMove(board, direction);

        if (!changed) return (ToDto(session, memberId), null);

        newBoard = AddTileFromEdge(newBoard, direction, participant.NextTile);
        participant.Score += points;
        participant.NextTile = GenerateNextTile();
        if (!HasMoves(newBoard)) participant.IsGameOver = true;
        participant.BoardJson = JsonSerializer.Serialize(newBoard);

        if (session.Participants.All(p => p.IsGameOver))
            session.Status = "completed";

        await db.SaveChangesAsync();
        _ = WebSocketMiddleware.BroadcastAsync("game_threes_update", new { sessionId });

        return (ToDto(session, memberId), null);
    }

    // ── Threes Logic ────────────────────────────────────────────────────────────

    private static bool CanMerge(int a, int b)
    {
        if (a == 0 || b == 0) return false;
        if ((a == 1 && b == 2) || (a == 2 && b == 1)) return true;
        return a == b && a >= 3;
    }

    private static (int[] row, int points, bool changed) SlideRowLeft(int[] row)
    {
        var cells = row.Where(v => v != 0).ToList();
        var merged = new List<int>();
        int points = 0;
        int i = 0;
        while (i < cells.Count)
        {
            if (i + 1 < cells.Count && CanMerge(cells[i], cells[i + 1]))
            {
                int val = cells[i] + cells[i + 1];
                merged.Add(val);
                points += val;
                i += 2;
            }
            else
            {
                merged.Add(cells[i]);
                i++;
            }
        }
        while (merged.Count < 4) merged.Add(0);
        var result = merged.ToArray();
        bool changed = !result.SequenceEqual(row);
        return (result, points, changed);
    }

    private static (int[] board, int points, bool changed) ApplyMove(int[] board, string direction)
    {
        var grid = BoardToGrid(board);
        int totalPoints = 0;
        bool anyChanged = false;

        grid = direction switch
        {
            "right" => RotateGrid(grid, 2),
            "up"    => TransposeGrid(grid),
            "down"  => TransposeGrid(RotateGrid(grid, 2)),
            _ => grid
        };

        for (int row = 0; row < 4; row++)
        {
            var rowArr = new int[4];
            for (int col = 0; col < 4; col++) rowArr[col] = grid[row, col];
            var (newRow, pts, ch) = SlideRowLeft(rowArr);
            totalPoints += pts;
            if (ch) anyChanged = true;
            for (int col = 0; col < 4; col++) grid[row, col] = newRow[col];
        }

        grid = direction switch
        {
            "right" => RotateGrid(grid, 2),
            "up"    => TransposeGrid(grid),
            "down"  => RotateGrid(TransposeGrid(grid), 2),
            _ => grid
        };

        return (GridToBoard(grid), totalPoints, anyChanged);
    }

    private static bool HasMoves(int[] board)
    {
        if (board.Any(v => v == 0)) return true;
        for (int r = 0; r < 4; r++)
            for (int c = 0; c < 3; c++)
                if (CanMerge(board[r * 4 + c], board[r * 4 + c + 1])) return true;
        for (int r = 0; r < 3; r++)
            for (int c = 0; c < 4; c++)
                if (CanMerge(board[r * 4 + c], board[(r + 1) * 4 + c])) return true;
        return false;
    }

    private static int[] AddTileFromEdge(int[] board, string direction, int tileValue)
    {
        // Tiles enter from the far edge — the opposite side from which the tiles collapsed
        // Slide LEFT  → tiles push in from the right (col 3)
        // Slide RIGHT → tiles push in from the left  (col 0)
        // Slide UP    → tiles push in from the bottom (row 3)
        // Slide DOWN  → tiles push in from the top   (row 0)
        List<int> edgeIndices = direction switch
        {
            "left"  => Enumerable.Range(0, 4).Select(r => r * 4 + 3).ToList(),
            "right" => Enumerable.Range(0, 4).Select(r => r * 4 + 0).ToList(),
            "up"    => Enumerable.Range(0, 4).Select(c => 12 + c).ToList(),
            "down"  => Enumerable.Range(0, 4).Select(c => c).ToList(),
            _       => [],
        };

        var empty = edgeIndices.Where(i => board[i] == 0).ToList();
        var newBoard = (int[])board.Clone();

        if (empty.Count > 0)
            newBoard[empty[Random.Shared.Next(empty.Count)]] = tileValue;
        else
        {
            var anyEmpty = Enumerable.Range(0, 16).Where(i => board[i] == 0).ToList();
            if (anyEmpty.Count > 0)
                newBoard[anyEmpty[Random.Shared.Next(anyEmpty.Count)]] = tileValue;
        }
        return newBoard;
    }

    private static int GenerateNextTile()
    {
        var r = Random.Shared.NextDouble();
        if (r < 1.0 / 3.0) return 1;
        if (r < 2.0 / 3.0) return 2;
        return 3;
    }

    private static (int[] board, int nextTile) InitialBoard()
    {
        // Start with 9 tiles (3× each of 1, 2, 3) in random positions — mirrors the original game
        var board = new int[16];
        var positions = Enumerable.Range(0, 16).OrderBy(_ => Random.Shared.Next()).Take(9).ToList();
        var tiles = new[] { 1, 1, 1, 2, 2, 2, 3, 3, 3 }.OrderBy(_ => Random.Shared.Next()).ToArray();
        for (int i = 0; i < 9; i++) board[positions[i]] = tiles[i];
        return (board, GenerateNextTile());
    }

    private static int[,] BoardToGrid(int[] board)
    {
        var grid = new int[4, 4];
        for (int i = 0; i < 16; i++) grid[i / 4, i % 4] = board[i];
        return grid;
    }

    private static int[] GridToBoard(int[,] grid)
    {
        var board = new int[16];
        for (int i = 0; i < 16; i++) board[i] = grid[i / 4, i % 4];
        return board;
    }

    private static int[,] RotateGrid(int[,] grid, int times)
    {
        for (int t = 0; t < times; t++)
        {
            var next = new int[4, 4];
            for (int r = 0; r < 4; r++)
                for (int c = 0; c < 4; c++)
                    next[c, 3 - r] = grid[r, c];
            grid = next;
        }
        return grid;
    }

    private static int[,] TransposeGrid(int[,] grid)
    {
        var next = new int[4, 4];
        for (int r = 0; r < 4; r++)
            for (int c = 0; c < 4; c++)
                next[c, r] = grid[r, c];
        return next;
    }

    // ── DTO mapping ─────────────────────────────────────────────────────────────

    private static GameThreesSessionDto ToDto(GameThreesSession session, Guid memberId)
    {
        var participants = session.Participants.OrderBy(p => p.Order).ToList();
        var displayNames = GameNameHelper.DeduplicateFirstNames(participants.Select(p => p.DisplayName).ToArray());

        return new GameThreesSessionDto
        {
            Id = session.Id,
            Title = session.Title,
            Status = session.Status,
            CreatedByMemberId = session.CreatedByMemberId,
            IsCreator = session.CreatedByMemberId == memberId,
            CreatedAt = session.CreatedAt,
            Participants = participants
                .Select((p, i) => new GameThreesParticipantDto
                {
                    Id = p.Id,
                    MemberId = p.MemberId,
                    DisplayName = displayNames[i],
                    Order = p.Order,
                    Score = p.Score,
                    Board = JsonSerializer.Deserialize<int[]>(p.BoardJson, _json) ?? new int[16],
                    NextTile = p.NextTile,
                    IsGameOver = p.IsGameOver,
                    IsMe = p.MemberId == memberId,
                })
                .ToList(),
        };
    }
}
