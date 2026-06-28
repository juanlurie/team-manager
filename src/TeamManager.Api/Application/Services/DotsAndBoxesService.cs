using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.DotsAndBoxes;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Application.Services;

public class DotsAndBoxesService(AppDbContext db)
{
    private static readonly JsonSerializerOptions _json = new() { PropertyNameCaseInsensitive = true };

    public async Task<List<DotsAndBoxesSessionSummaryDto>> GetOpenSessionsAsync()
    {
        return await db.DotsAndBoxesSessions
            .Include(s => s.CreatedBy)
            .Include(s => s.Participants)
            .Where(s => s.Status != "completed")
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new DotsAndBoxesSessionSummaryDto
            {
                Id = s.Id,
                Title = s.Title,
                Status = s.Status,
                GridSize = s.GridSize,
                PlayerCount = s.Participants.Count,
                CreatedByName = s.CreatedBy != null
                    ? $"{s.CreatedBy.FirstName} {s.CreatedBy.LastName}".Trim()
                    : "",
                CreatedAt = s.CreatedAt,
            })
            .ToListAsync();
    }

    public async Task<DotsAndBoxesSessionDto?> GetSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.DotsAndBoxesSessions
            .Include(s => s.Participants).ThenInclude(p => p.Member)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return null;
        return ToDto(session, memberId);
    }

    public async Task<DotsAndBoxesSessionDto> CreateSessionAsync(Guid memberId, CreateDotsAndBoxesSessionRequest req)
    {
        var member = await db.TeamMembers.FindAsync(memberId)
            ?? throw new InvalidOperationException("Member not found.");

        var session = new DotsAndBoxesSession
        {
            Title = req.Title,
            GridSize = Math.Clamp(req.GridSize, 3, 6),
            CreatedByMemberId = memberId,
        };

        var humanParticipant = new DotsAndBoxesParticipant
        {
            SessionId = session.Id,
            MemberId = memberId,
            DisplayName = $"{member.FirstName} {member.LastName}".Trim(),
            Order = 0,
        };

        db.DotsAndBoxesSessions.Add(session);
        db.DotsAndBoxesParticipants.Add(humanParticipant);

        await db.SaveChangesAsync();

        if (req.WithAi)
        {
            var aiParticipant = new DotsAndBoxesParticipant
            {
                SessionId = session.Id,
                MemberId = null,
                DisplayName = "AI",
                Order = 1,
                IsAi = true,
            };
            db.DotsAndBoxesParticipants.Add(aiParticipant);

            // Auto-start: resolve CurrentParticipantId after participants are persisted
            session.Status = "inprogress";
            session.CurrentParticipantId = humanParticipant.Id;
            await db.SaveChangesAsync();
        }

        return ToDto(session, memberId);
    }

    public async Task<(DotsAndBoxesSessionDto? session, string? error)> JoinSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.DotsAndBoxesSessions
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return (null, null);
        if (session.Status != "waiting") return (null, "Game has already started.");
        if (session.Participants.Any(p => p.MemberId == memberId)) return (null, "Already joined.");
        if (session.Participants.Count >= 4) return (null, "Session is full (max 4 players).");

        var member = await db.TeamMembers.FindAsync(memberId)
            ?? throw new InvalidOperationException("Member not found.");

        var participant = new DotsAndBoxesParticipant
        {
            SessionId = sessionId,
            MemberId = memberId,
            DisplayName = $"{member.FirstName} {member.LastName}".Trim(),
            Order = session.Participants.Count,
        };

        db.DotsAndBoxesParticipants.Add(participant);
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("dots_boxes_update", new { sessionId });

        var updated = await db.DotsAndBoxesSessions
            .Include(s => s.Participants).ThenInclude(p => p.Member)
            .FirstAsync(s => s.Id == sessionId);

        return (ToDto(updated, memberId), null);
    }

    public async Task<(DotsAndBoxesSessionDto? session, string? error)> StartSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.DotsAndBoxesSessions
            .Include(s => s.Participants)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return (null, null);
        if (session.CreatedByMemberId != memberId) return (null, "Only the creator can start.");
        if (session.Status != "waiting") return (null, "Game is not in waiting state.");
        if (session.Participants.Count < 2) return (null, "Need at least 2 players.");

        var firstParticipant = session.Participants.OrderBy(p => p.Order).First();
        session.Status = "inprogress";
        session.CurrentParticipantId = firstParticipant.Id;

        await db.SaveChangesAsync();
        _ = WebSocketMiddleware.BroadcastAsync("dots_boxes_update", new { sessionId });

        var updated = await db.DotsAndBoxesSessions
            .Include(s => s.Participants).ThenInclude(p => p.Member)
            .FirstAsync(s => s.Id == sessionId);

        return (ToDto(updated, memberId), null);
    }

    public async Task<(DotsAndBoxesSessionDto? session, string? error)> MakeMoveAsync(Guid sessionId, Guid memberId, MakeDotsAndBoxesMoveRequest req)
    {
        var session = await db.DotsAndBoxesSessions
            .Include(s => s.Participants).ThenInclude(p => p.Member)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return (null, null);
        if (session.Status != "inprogress") return (null, "Game is not in progress.");

        var myParticipant = session.Participants.FirstOrDefault(p => p.MemberId == memberId);
        if (myParticipant is null) return (null, "You are not in this game.");
        if (session.CurrentParticipantId != myParticipant.Id) return (null, "Not your turn.");

        var lines = JsonSerializer.Deserialize<List<DotsAndBoxesLineDto>>(session.LinesJson, _json) ?? [];
        var boxes = JsonSerializer.Deserialize<Dictionary<string, Guid>>(session.BoxesJson, _json) ?? [];

        var t = req.T.ToUpper();
        if (t != "H" && t != "V") return (null, "Invalid line type.");
        var g = session.GridSize;
        if (t == "H" && (req.R < 0 || req.R > g || req.C < 0 || req.C >= g)) return (null, "Line out of bounds.");
        if (t == "V" && (req.R < 0 || req.R >= g || req.C < 0 || req.C > g)) return (null, "Line out of bounds.");

        var newLine = new DotsAndBoxesLineDto { T = t, R = req.R, C = req.C };
        if (lines.Any(l => l.T == t && l.R == req.R && l.C == req.C)) return (null, "Line already drawn.");

        ApplyMove(session, myParticipant, newLine, lines, boxes, g);

        // Run AI turns synchronously until it's a human's turn or game over
        var ordered = session.Participants.OrderBy(p => p.Order).ToList();
        while (session.Status == "inprogress")
        {
            var currentParticipant = ordered.FirstOrDefault(p => p.Id == session.CurrentParticipantId);
            if (currentParticipant is null || !currentParticipant.IsAi) break;

            var aiMove = GreedyMove(lines, boxes, g);
            if (aiMove is null) break;
            ApplyMove(session, currentParticipant, aiMove, lines, boxes, g);
        }

        session.LinesJson = JsonSerializer.Serialize(lines);
        session.BoxesJson = JsonSerializer.Serialize(boxes);

        await db.SaveChangesAsync();
        _ = WebSocketMiddleware.BroadcastAsync("dots_boxes_update", new { sessionId });

        return (ToDto(session, memberId), null);
    }

    // Applies a single line move in-place (mutates lines, boxes, session state).
    private static void ApplyMove(
        DotsAndBoxesSession session,
        DotsAndBoxesParticipant participant,
        DotsAndBoxesLineDto move,
        List<DotsAndBoxesLineDto> lines,
        Dictionary<string, Guid> boxes,
        int g)
    {
        lines.Add(move);

        var newlyCompleted = FindCompletedBoxes(move, lines, boxes, g);
        foreach (var box in newlyCompleted)
        {
            boxes[box] = participant.Id;
            participant.Score++;
        }

        var totalBoxes = g * g;
        if (boxes.Count >= totalBoxes)
        {
            session.Status = "completed";
            session.CurrentParticipantId = null;
            return;
        }

        if (newlyCompleted.Count == 0)
        {
            var ordered = session.Participants.OrderBy(p => p.Order).ToList();
            var idx = ordered.FindIndex(p => p.Id == participant.Id);
            var nextIdx = (idx + 1) % ordered.Count;
            session.CurrentParticipantId = ordered[nextIdx].Id;
        }
        // If boxes were completed, same player goes again (CurrentParticipantId unchanged)
    }

    // Greedy AI: complete a box > safe line > any line
    private static DotsAndBoxesLineDto? GreedyMove(
        List<DotsAndBoxesLineDto> lines,
        Dictionary<string, Guid> boxes,
        int g)
    {
        var all = AllLines(g).Where(l => !lines.Any(e => e.T == l.T && e.R == l.R && e.C == l.C)).ToList();
        if (all.Count == 0) return null;

        // Priority 1: complete a box
        foreach (var candidate in all)
        {
            var completed = FindCompletedBoxes(candidate, [.. lines, candidate], boxes, g);
            if (completed.Count > 0) return candidate;
        }

        // Priority 2: safe line (doesn't give opponent a 3-sided box)
        var safe = all.Where(l => !CreatesDangerousBox(l, lines, boxes, g)).ToList();
        if (safe.Count > 0) return safe[Random.Shared.Next(safe.Count)];

        // Fallback: any remaining line (end-game chains — pick line giving fewest boxes)
        return all
            .OrderBy(l => FindCompletedBoxes(l, [.. lines, l], boxes, g).Count)
            .ThenBy(_ => Random.Shared.Next())
            .First();
    }

    // Returns true if drawing this line would create a box with exactly 3 sides (gift to opponent)
    private static bool CreatesDangerousBox(
        DotsAndBoxesLineDto candidate,
        List<DotsAndBoxesLineDto> lines,
        Dictionary<string, Guid> boxes,
        int g)
    {
        bool HasH(int r, int c) => lines.Any(l => l.T == "H" && l.R == r && l.C == c);
        bool HasV(int r, int c) => lines.Any(l => l.T == "V" && l.R == r && l.C == c);

        int BoxSides(int r, int c)
        {
            if (r < 0 || r >= g || c < 0 || c >= g) return 0;
            int count = 0;
            if (HasH(r, c)) count++;
            if (HasH(r + 1, c)) count++;
            if (HasV(r, c)) count++;
            if (HasV(r, c + 1)) count++;
            return count;
        }

        IEnumerable<(int r, int c)> AdjacentBoxes()
        {
            if (candidate.T == "H") { yield return (candidate.R - 1, candidate.C); yield return (candidate.R, candidate.C); }
            else { yield return (candidate.R, candidate.C - 1); yield return (candidate.R, candidate.C); }
        }

        foreach (var (r, c) in AdjacentBoxes())
        {
            if (r < 0 || r >= g || c < 0 || c >= g) continue;
            if (boxes.ContainsKey($"{r},{c}")) continue;
            // After drawing the candidate, this box would have BoxSides+1 sides
            if (BoxSides(r, c) == 2) return true; // would become 3-sided = dangerous
        }
        return false;
    }

    private static IEnumerable<DotsAndBoxesLineDto> AllLines(int g)
    {
        // H lines: rows 0..g, cols 0..g-1
        for (int r = 0; r <= g; r++)
            for (int c = 0; c < g; c++)
                yield return new DotsAndBoxesLineDto { T = "H", R = r, C = c };
        // V lines: rows 0..g-1, cols 0..g
        for (int r = 0; r < g; r++)
            for (int c = 0; c <= g; c++)
                yield return new DotsAndBoxesLineDto { T = "V", R = r, C = c };
    }

    private static List<string> FindCompletedBoxes(
        DotsAndBoxesLineDto newLine, List<DotsAndBoxesLineDto> lines,
        Dictionary<string, Guid> existingBoxes, int g)
    {
        var completed = new List<string>();
        bool HasH(int r, int c) => lines.Any(l => l.T == "H" && l.R == r && l.C == c);
        bool HasV(int r, int c) => lines.Any(l => l.T == "V" && l.R == r && l.C == c);

        bool IsComplete(int boxR, int boxC) =>
            boxR >= 0 && boxR < g && boxC >= 0 && boxC < g &&
            HasH(boxR, boxC) && HasH(boxR + 1, boxC) &&
            HasV(boxR, boxC) && HasV(boxR, boxC + 1);

        IEnumerable<(int r, int c)> CandidateBoxes()
        {
            if (newLine.T == "H")
            {
                yield return (newLine.R - 1, newLine.C);
                yield return (newLine.R, newLine.C);
            }
            else
            {
                yield return (newLine.R, newLine.C - 1);
                yield return (newLine.R, newLine.C);
            }
        }

        foreach (var (r, c) in CandidateBoxes())
        {
            var key = $"{r},{c}";
            if (IsComplete(r, c) && !existingBoxes.ContainsKey(key))
                completed.Add(key);
        }

        return completed;
    }

    private static DotsAndBoxesSessionDto ToDto(DotsAndBoxesSession session, Guid memberId)
    {
        var lines = JsonSerializer.Deserialize<List<DotsAndBoxesLineDto>>(session.LinesJson, _json) ?? [];
        var boxes = JsonSerializer.Deserialize<Dictionary<string, Guid>>(session.BoxesJson, _json) ?? [];

        var myParticipant = session.Participants.FirstOrDefault(p => p.MemberId == memberId);

        var participantDtos = session.Participants
            .OrderBy(p => p.Order)
            .Select(p => new DotsAndBoxesParticipantDto
            {
                Id = p.Id,
                MemberId = p.MemberId,
                DisplayName = p.DisplayName,
                Order = p.Order,
                Score = p.Score,
                IsMe = p.MemberId == memberId,
                IsCurrentTurn = p.Id == session.CurrentParticipantId,
                IsAi = p.IsAi,
            })
            .ToList();

        return new DotsAndBoxesSessionDto
        {
            Id = session.Id,
            Title = session.Title,
            Status = session.Status,
            GridSize = session.GridSize,
            Lines = lines,
            Boxes = boxes,
            CurrentParticipantId = session.CurrentParticipantId,
            CreatedByMemberId = session.CreatedByMemberId,
            IsCreator = session.CreatedByMemberId == memberId,
            IsMyTurn = myParticipant is not null && session.CurrentParticipantId == myParticipant.Id,
            MyParticipantId = myParticipant?.Id,
            CreatedAt = session.CreatedAt,
            Participants = participantDtos,
            HasAi = session.Participants.Any(p => p.IsAi),
        };
    }
}
