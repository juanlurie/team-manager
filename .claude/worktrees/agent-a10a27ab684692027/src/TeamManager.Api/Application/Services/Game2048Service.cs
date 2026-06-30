using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Game2048;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Application.Services;

public class Game2048Service(AppDbContext db)
{
    private static readonly JsonSerializerOptions _json = new() { PropertyNameCaseInsensitive = true };

    public async Task<List<Game2048SessionSummaryDto>> GetOpenSessionsAsync()
    {
        return await db.Game2048Sessions
            .Include(s => s.CreatedBy)
            .Include(s => s.Participants)
            .Where(s => s.Status == "inprogress")
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new Game2048SessionSummaryDto
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

    public async Task<Game2048SessionDto?> GetSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.Game2048Sessions
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return null;
        return ToDto(session, memberId);
    }

    public async Task<Game2048SessionDto> CreateSessionAsync(Guid memberId, CreateGame2048SessionRequest req)
    {
        var member = await db.TeamMembers.FindAsync(memberId)
            ?? throw new InvalidOperationException("Member not found.");

        var session = new Game2048Session
        {
            Title = req.Title,
            CreatedByMemberId = memberId,
            Status = "inprogress",
        };

        var participant = new Game2048Participant
        {
            SessionId = session.Id,
            MemberId = memberId,
            DisplayName = $"{member.FirstName} {member.LastName}".Trim(),
            Order = 0,
            BoardJson = JsonSerializer.Serialize(InitialBoard()),
        };

        db.Game2048Sessions.Add(session);
        db.Game2048Participants.Add(participant);
        await db.SaveChangesAsync();

        return ToDto(session, memberId);
    }

    public async Task<(Game2048SessionDto? session, string? error)> JoinSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.Game2048Sessions
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return (null, null);
        if (session.Status == "completed") return (null, "Game is already over.");
        if (session.Participants.Any(p => p.MemberId == memberId)) return (null, "Already joined.");
        if (session.Participants.Count >= 6) return (null, "Session is full (max 6 players).");

        var member = await db.TeamMembers.FindAsync(memberId)
            ?? throw new InvalidOperationException("Member not found.");

        var participant = new Game2048Participant
        {
            SessionId = sessionId,
            MemberId = memberId,
            DisplayName = $"{member.FirstName} {member.LastName}".Trim(),
            Order = session.Participants.Count,
            BoardJson = JsonSerializer.Serialize(InitialBoard()),
        };

        db.Game2048Participants.Add(participant);
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("game_2048_update", new { sessionId });

        var updated = await db.Game2048Sessions
            .Include(s => s.Participants)
            .FirstAsync(s => s.Id == sessionId);

        return (ToDto(updated, memberId), null);
    }

    public async Task<(Game2048SessionDto? session, string? error)> StartSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.Game2048Sessions
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return (null, null);
        if (session.CreatedByMemberId != memberId) return (null, "Only the creator can start.");
        if (session.Status != "waiting") return (null, "Game is not in waiting state.");
        if (session.Participants.Count < 2) return (null, "Need at least 2 players.");

        session.Status = "inprogress";
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("game_2048_update", new { sessionId });

        return (ToDto(session, memberId), null);
    }

    public async Task<(Game2048SessionDto? session, string? error)> MakeMoveAsync(Guid sessionId, Guid memberId, Game2048MoveRequest req)
    {
        var session = await db.Game2048Sessions
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

        newBoard = AddRandomTile(newBoard);
        participant.Score += points;
        if (newBoard.Any(v => v == 2048)) participant.HasWon = true;
        if (!HasMoves(newBoard)) participant.IsGameOver = true;
        participant.BoardJson = JsonSerializer.Serialize(newBoard);

        if (session.Participants.All(p => p.IsGameOver))
            session.Status = "completed";

        await db.SaveChangesAsync();
        _ = WebSocketMiddleware.BroadcastAsync("game_2048_update", new { sessionId });

        return (ToDto(session, memberId), null);
    }

    // ── 2048 Logic ─────────────────────────────────────────────────────────────

    private static (int[] board, int points, bool changed) ApplyMove(int[] board, string direction)
    {
        var grid = BoardToGrid(board);
        int points = 0;
        bool changed = false;

        grid = direction switch
        {
            "right" => RotateGrid(grid, 2),
            "up" => TransposeGrid(grid),
            "down" => RotateGrid(TransposeGrid(grid), 2),
            _ => grid
        };

        for (int row = 0; row < 4; row++)
        {
            var cells = new List<int>();
            for (int col = 0; col < 4; col++)
                if (grid[row, col] != 0) cells.Add(grid[row, col]);

            var merged = new List<int>();
            for (int i = 0; i < cells.Count; i++)
            {
                if (i + 1 < cells.Count && cells[i] == cells[i + 1])
                {
                    int val = cells[i] * 2;
                    merged.Add(val);
                    points += val;
                    i++;
                }
                else merged.Add(cells[i]);
            }
            while (merged.Count < 4) merged.Add(0);

            for (int col = 0; col < 4; col++)
            {
                if (grid[row, col] != merged[col]) changed = true;
                grid[row, col] = merged[col];
            }
        }

        grid = direction switch
        {
            "right" => RotateGrid(grid, 2),
            "up" => TransposeGrid(grid),
            "down" => TransposeGrid(RotateGrid(grid, 2)),
            _ => grid
        };

        return (GridToBoard(grid), points, changed);
    }

    private static bool HasMoves(int[] board)
    {
        if (board.Any(v => v == 0)) return true;
        for (int i = 0; i < 16; i++)
        {
            if (i % 4 < 3 && board[i] == board[i + 1]) return true;
            if (i < 12 && board[i] == board[i + 4]) return true;
        }
        return false;
    }

    private static int[] AddRandomTile(int[] board)
    {
        var empty = Enumerable.Range(0, 16).Where(i => board[i] == 0).ToList();
        if (empty.Count == 0) return board;
        var newBoard = (int[])board.Clone();
        newBoard[empty[Random.Shared.Next(empty.Count)]] = Random.Shared.NextDouble() < 0.9 ? 2 : 4;
        return newBoard;
    }

    private static int[] InitialBoard()
    {
        var board = new int[16];
        board = AddRandomTile(board);
        board = AddRandomTile(board);
        return board;
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

    // ── DTO mapping ────────────────────────────────────────────────────────────

    private static Game2048SessionDto ToDto(Game2048Session session, Guid memberId)
    {
        var participants = session.Participants.OrderBy(p => p.Order).ToList();
        var displayNames = GameNameHelper.DeduplicateFirstNames(participants.Select(p => p.DisplayName).ToArray());

        return new Game2048SessionDto
        {
            Id = session.Id,
            Title = session.Title,
            Status = session.Status,
            CreatedByMemberId = session.CreatedByMemberId,
            IsCreator = session.CreatedByMemberId == memberId,
            CreatedAt = session.CreatedAt,
            Participants = participants
                .Select((p, i) => new Game2048ParticipantDto
                {
                    Id = p.Id,
                    MemberId = p.MemberId,
                    DisplayName = displayNames[i],
                    Order = p.Order,
                    Score = p.Score,
                    Board = JsonSerializer.Deserialize<int[]>(p.BoardJson, _json) ?? new int[16],
                    IsGameOver = p.IsGameOver,
                    HasWon = p.HasWon,
                    IsMe = p.MemberId == memberId,
                })
                .ToList(),
        };
    }
}
