using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.ScrumPoker;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Application.Services;

public class ScrumPokerService : IScrumPokerService
{
    private readonly AppDbContext db;

    public ScrumPokerService(AppDbContext db)
    {
        this.db = db;
    }

    public async Task<List<ScrumPokerSessionDto>> GetActiveSessionsAsync(Guid memberId)
    {
        var sessions = await db.ScrumPokerSessions
            .Include(s => s.CreatedByMember)
            .Include(s => s.Votes)
            .Where(s => s.Revealed == false || s.RevealedAt.HasValue && s.RevealedAt.Value.AddDays(1) > DateTimeOffset.UtcNow)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        return sessions.Select(s => new ScrumPokerSessionDto(
            s.Id,
            s.Title,
            s.StoryTitle,
            s.Description,
            s.Scale,
            s.Revealed,
            s.CreatedAt,
            s.RevealedAt,
            s.CreatedByMember.FirstName + " " + s.CreatedByMember.LastName,
            s.Votes.Count
        )).ToList();
    }

    public async Task<ScrumPokerSessionDetailDto> GetSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.ScrumPokerSessions
            .Include(s => s.CreatedByMember)
            .Include(s => s.Votes)
            .ThenInclude(v => v.Member)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) throw new KeyNotFoundException("Session not found.");

        return MapSessionDetail(session, memberId);
    }

    public async Task<ScrumPokerSessionDetailDto> CreateSessionAsync(Guid memberId, CreateScrumPokerSessionRequest request)
    {
        var session = new ScrumPokerSession
        {
            CreatedByMemberId = memberId,
            Title = request.Title,
            StoryTitle = request.StoryTitle,
            Description = request.Description,
            Scale = request.Scale
        };

        db.ScrumPokerSessions.Add(session);
        await db.SaveChangesAsync();

        var created = await GetSessionAsync(session.Id, memberId);
        _ = WebSocketMiddleware.BroadcastAsync("scrum_poker_session_created", new { sessionId = session.Id });
        return created;
    }

    public async Task<ScrumPokerSessionDetailDto> CastVoteAsync(Guid sessionId, Guid memberId, CastScrumPokerVoteRequest request)
    {
        var session = await db.ScrumPokerSessions
            .Include(s => s.Votes)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) throw new KeyNotFoundException("Session not found.");
        if (session.Revealed) throw new InvalidOperationException("Votes are already revealed.");

        var existingVote = session.Votes.FirstOrDefault(v => v.MemberId == memberId);
        if (existingVote is not null)
        {
            existingVote.Value = request.Value;
            existingVote.VotedAt = DateTimeOffset.UtcNow;
        }
        else
        {
            session.Votes.Add(new ScrumPokerVote
            {
                SessionId = sessionId,
                MemberId = memberId,
                Value = request.Value
            });
        }

        await db.SaveChangesAsync();
        var voted = await GetSessionAsync(sessionId, memberId);
        _ = WebSocketMiddleware.BroadcastAsync("scrum_poker_vote_cast", new { sessionId, voteCount = voted.Votes.Count });
        return voted;
    }

    public async Task<ScrumPokerSessionDetailDto> RevealVotesAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.ScrumPokerSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) throw new KeyNotFoundException("Session not found.");
        if (session.CreatedByMemberId != memberId) throw new UnauthorizedAccessException("Only the session creator can reveal votes.");

        session.Revealed = true;
        session.RevealedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        var revealed = await GetSessionAsync(sessionId, memberId);
        _ = WebSocketMiddleware.BroadcastAsync("scrum_poker_votes_revealed", new { sessionId });
        return revealed;
    }

    public async Task<ScrumPokerSessionDetailDto> ResetSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.ScrumPokerSessions
            .Include(s => s.Votes)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) throw new KeyNotFoundException("Session not found.");
        if (session.CreatedByMemberId != memberId) throw new UnauthorizedAccessException("Only the session creator can reset the session.");

        session.Revealed = false;
        session.RevealedAt = null;
        session.ResetAt = DateTimeOffset.UtcNow;
        session.Votes.Clear();
        await db.SaveChangesAsync();

        var reset = await GetSessionAsync(sessionId, memberId);
        _ = WebSocketMiddleware.BroadcastAsync("scrum_poker_session_reset", new { sessionId });
        return reset;
    }

    public async Task<bool> DeleteSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.ScrumPokerSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return false;
        if (session.CreatedByMemberId != memberId) return false;

        db.ScrumPokerSessions.Remove(session);
        await db.SaveChangesAsync();
        _ = WebSocketMiddleware.BroadcastAsync("scrum_poker_session_deleted", new { sessionId });
        return true;
    }

    private ScrumPokerSessionDetailDto MapSessionDetail(ScrumPokerSession session, Guid currentMemberId)
    {
        var votes = session.Votes.Select(v => new ScrumPokerVoteDto(
            v.Id,
            v.MemberId,
            v.Member.FirstName + " " + v.Member.LastName,
            session.Revealed ? v.Value : (v.MemberId == currentMemberId ? v.Value : null),
            v.VotedAt
        )).ToList();

        return new ScrumPokerSessionDetailDto(
            session.Id,
            session.Title,
            session.StoryTitle,
            session.Description,
            session.Scale,
            session.Revealed,
            session.CreatedAt,
            session.RevealedAt,
            session.CreatedByMember.FirstName + " " + session.CreatedByMember.LastName,
            votes
        );
    }
}
