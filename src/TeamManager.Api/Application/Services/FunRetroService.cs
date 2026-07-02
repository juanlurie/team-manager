using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.FunRetro;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Application.Services;

public class FunRetroService(AppDbContext db, AiPromptExecutorService aiExecutor)
{
    public async Task<FunRetroSessionDto> CreateSessionAsync(Guid memberId, CreateFunRetroSessionRequest req)
    {
        var member = await db.TeamMembers.FindAsync(memberId)
            ?? throw new InvalidOperationException("Member not found.");

        _ = member; // existence check; name not needed on session

        var columnsJson = req.Columns is { Count: > 0 }
            ? JsonSerializer.Serialize(req.Columns, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
            : null;

        var title = string.IsNullOrWhiteSpace(req.Title)
            ? $"Retro — {DateTimeOffset.Now:MMM d, yyyy}"
            : req.Title.Trim();

        var session = new FunRetroSession
        {
            Title = title,
            CreatedByMemberId = memberId,
            SprintId = req.SprintId,
            ColumnsJson = columnsJson,
            IcebreakerQuestion = string.IsNullOrWhiteSpace(req.IcebreakerQuestion) ? null : req.IcebreakerQuestion.Trim(),
            Theme = ValidTheme(req.Theme),
            CanvasLayout = ValidLayout(req.CanvasLayout),
        };

        db.FunRetroSessions.Add(session);
        await db.SaveChangesAsync();

        return (await GetSessionAsync(session.Id, memberId))!;
    }

    public async Task<bool> DeleteSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.FunRetroSessions.FindAsync(sessionId);
        if (session is null) return false;
        if (session.CreatedByMemberId != memberId) return false;

        var polls = await db.Set<Poll>().Where(p => p.RetroSessionId == sessionId).ToListAsync();
        db.RemoveRange(polls);

        db.FunRetroSessions.Remove(session);
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("fun_retro_session_deleted", new { sessionId }, guestAllowed: true);
        return true;
    }

    public async Task<FunRetroSessionDto?> GetSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.FunRetroSessions
            .Include(s => s.CreatedBy)
            .Include(s => s.Sprint)
            .Include(s => s.Cards)
                .ThenInclude(c => c.Votes)
            .Include(s => s.Cards)
                .ThenInclude(c => c.Reactions)
            .Include(s => s.Cards)
                .ThenInclude(c => c.Author)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return null;

        var isAddPhase = session.Phase == "add";
        var isCreator = session.CreatedByMemberId == memberId;
        var totalCardCount = session.Cards.Count;

        var cardDtos = session.Cards
            .OrderBy(c => c.CreatedAt)
            .Select(c =>
            {
                var isOwn = c.AuthorId == memberId;
                var hideContent = isAddPhase && !isOwn && session.HideCardsOnAdd;

                var reactionDtos = c.Reactions
                    .GroupBy(r => r.Emoji)
                    .Select(g => new FunRetroReactionDto
                    {
                        Emoji = g.Key,
                        Count = g.Count(),
                        Mine = g.Any(r => r.MemberId == memberId),
                    })
                    .ToList();

                return new FunRetroCardDto
                {
                    Id = c.Id,
                    SessionId = c.SessionId,
                    Column = c.Column,
                    Text = hideContent ? null : c.Text,
                    AuthorName = c.AuthorName, // always returned so participation is visible
                    AuthorId = c.AuthorId,
                    AuthorAvatarSeed = c.Author?.AvatarSeed,
                    IsOwn = isOwn,
                    CreatedAt = c.CreatedAt,
                    VoteCount = c.Votes.Count,
                    MyVoteCount = c.Votes.Count(v => v.VoterId == memberId),
                    Reactions = reactionDtos,
                    PositionX = c.PositionX,
                    PositionY = c.PositionY,
                    Color = c.Color,
                    GroupId = c.GroupId,
                };
            })
            .ToList();

        FunRetroAnalysisDto? analysis = null;
        if (session.AiAnalysisJson is not null)
        {
            try
            {
                analysis = JsonSerializer.Deserialize<FunRetroAnalysisDto>(session.AiAnalysisJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch { /* ignore malformed */ }
        }

        var icebreakerAnswers = new List<IcebreakerAnswerDto>();
        if (session.IcebreakerAnswersJson is not null)
        {
            try
            {
                icebreakerAnswers = JsonSerializer.Deserialize<List<IcebreakerAnswerDto>>(session.IcebreakerAnswersJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
            }
            catch { /* ignore malformed */ }
        }

        var columns = new List<RetroColumnDto>();
        if (session.ColumnsJson is not null)
        {
            try
            {
                columns = JsonSerializer.Deserialize<List<RetroColumnDto>>(session.ColumnsJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
            }
            catch { /* ignore malformed */ }
        }

        return new FunRetroSessionDto
        {
            Id = session.Id,
            Title = session.Title,
            Phase = session.Phase,
            CreatedByMemberId = session.CreatedByMemberId,
            IsCreator = isCreator,
            SprintId = session.SprintId,
            SprintName = session.Sprint?.Name,
            CreatedAt = session.CreatedAt,
            Cards = cardDtos,
            TotalCardCount = totalCardCount,
            AiAnalysis = analysis,
            TimerJson = session.TimerJson,
            IcebreakerAnswers = icebreakerAnswers,
            IcebreakerQuestion = session.IcebreakerQuestion,
            Columns = columns,
            HideCardsOnAdd = session.HideCardsOnAdd,
            ParticipationTracking = session.ParticipationTracking,
            Theme = session.Theme,
            CanvasLayout = session.CanvasLayout,
        };
    }

    public async Task<bool> UpdateSettingsAsync(Guid sessionId, Guid memberId, bool hideCardsOnAdd, bool participationTracking, string? theme)
    {
        var session = await db.FunRetroSessions.FindAsync(sessionId);
        if (session is null || session.CreatedByMemberId != memberId) return false;

        var validTheme = ValidTheme(theme);
        session.HideCardsOnAdd = hideCardsOnAdd;
        session.ParticipationTracking = participationTracking;
        session.Theme = validTheme;
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("fun_retro_settings_updated",
            new { sessionId, hideCardsOnAdd, participationTracking, theme = validTheme }, guestAllowed: true);
        return true;
    }

    private static readonly HashSet<string> ValidThemes = ["space", "f1", "ocean", "retro-gaming"];

    /// <summary>Rejects unrecognized theme values (typo, stale client) instead of silently
    /// persisting a string that will never match anything the frontend's theme picker knows
    /// how to render.</summary>
    private static string? ValidTheme(string? theme) =>
        theme is not null && ValidThemes.Contains(theme) ? theme : null;

    private static readonly HashSet<string> ValidLayouts = ["columns", "single"];

    private static string? ValidLayout(string? layout) =>
        layout is not null && ValidLayouts.Contains(layout) ? layout : null;

    public async Task<bool> SetTimerAsync(Guid sessionId, Guid memberId, string timerJson)
    {
        var session = await db.FunRetroSessions.FindAsync(sessionId);
        if (session is null) return false;
        if (session.CreatedByMemberId != memberId) return false;

        session.TimerJson = timerJson;
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("fun_retro_timer_updated", new { sessionId, timerJson }, guestAllowed: true);
        return true;
    }

    public async Task<List<FunRetroPrevActionDto>> GetPreviousActionsAsync(Guid sessionId)
    {
        var current = await db.FunRetroSessions.FindAsync(sessionId);
        if (current is null) return [];

        var prev = await db.FunRetroSessions
            .Where(s => s.CreatedAt < current.CreatedAt)
            .OrderByDescending(s => s.CreatedAt)
            .Include(s => s.Cards)
            .FirstOrDefaultAsync();

        if (prev is null) return [];

        return prev.Cards
            .Where(c => c.Column == "action" && c.Text != null)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new FunRetroPrevActionDto
            {
                Id = c.Id,
                Text = c.Text!,
                AuthorName = c.AuthorName,
            })
            .ToList();
    }

    public async Task<(bool success, List<IcebreakerAnswerDto> answers)> SubmitIcebreakerAnswerAsync(
        Guid sessionId, Guid memberId, string answer)
    {
        var session = await db.FunRetroSessions.FindAsync(sessionId);
        if (session is null) return (false, []);

        var member = await db.TeamMembers.FindAsync(memberId);
        if (member is null) return (false, []);

        var memberName = $"{member.FirstName} {member.LastName}".Trim();

        var answers = new List<IcebreakerAnswerDto>();
        if (session.IcebreakerAnswersJson is not null)
        {
            try
            {
                answers = JsonSerializer.Deserialize<List<IcebreakerAnswerDto>>(session.IcebreakerAnswersJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
            }
            catch { answers = []; }
        }

        answers.RemoveAll(a => a.MemberId == memberId);
        answers.Add(new IcebreakerAnswerDto { MemberId = memberId, MemberName = memberName, Answer = answer });

        session.IcebreakerAnswersJson = JsonSerializer.Serialize(answers);
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("fun_retro_icebreaker_answered",
            new { sessionId, memberId, memberName, answer }, guestAllowed: true);

        return (true, answers);
    }

    public async Task<List<FunRetroSessionSummaryDto>> GetOpenSessionsAsync()
    {
        return await db.FunRetroSessions
            .Where(s => s.Phase != "done")
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new FunRetroSessionSummaryDto
            {
                Id = s.Id,
                Title = s.Title,
                Phase = s.Phase,
                CreatedByMemberId = s.CreatedByMemberId,
                CreatedByName = s.CreatedBy != null ? $"{s.CreatedBy.FirstName} {s.CreatedBy.LastName}".Trim() : "",
                SprintName = s.Sprint != null ? s.Sprint.Name : null,
                CardCount = s.Cards.Count,
                CreatedAt = s.CreatedAt,
            })
            .ToListAsync();
    }

    public async Task<FunRetroSessionDto?> AddCardAsync(Guid sessionId, Guid memberId, AddFunRetroCardRequest req)
    {
        var session = await db.FunRetroSessions.FindAsync(sessionId);
        if (session is null) return null;

        var member = await db.TeamMembers.FindAsync(memberId);
        if (member is null) return null;

        var card = new FunRetroCard
        {
            SessionId = sessionId,
            Column = req.Column,
            Text = req.Text,
            AuthorId = memberId,
            AuthorName = $"{member.FirstName} {member.LastName}".Trim(),
            Color = req.Color,
        };

        db.FunRetroCards.Add(card);
        await db.SaveChangesAsync();

        var count = await db.FunRetroCards.CountAsync(c => c.SessionId == sessionId);
        _ = WebSocketMiddleware.BroadcastAsync("fun_retro_card_added", new { sessionId, count }, guestAllowed: true);

        return await GetSessionAsync(sessionId, memberId);
    }

    public async Task<bool> DeleteCardAsync(Guid sessionId, Guid cardId, Guid memberId)
    {
        var card = await db.FunRetroCards
            .Include(c => c.Session)
            .FirstOrDefaultAsync(c => c.Id == cardId && c.SessionId == sessionId);

        if (card is null) return false;

        var isAuthor = card.AuthorId == memberId;
        var isCreator = card.Session.CreatedByMemberId == memberId;

        if (!isAuthor && !isCreator) return false;
        if (card.Session.Phase != "add") return false;

        db.FunRetroCards.Remove(card);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<FunRetroSessionDto?> SetPhaseAsync(Guid sessionId, Guid memberId, string phase)
    {
        var session = await db.FunRetroSessions.FindAsync(sessionId);
        if (session is null) return null;
        if (session.CreatedByMemberId != memberId) return null;

        var wasAddPhase = session.Phase == "add";
        session.Phase = phase;
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("fun_retro_phase_changed", new { sessionId, phase }, guestAllowed: true);

        if (wasAddPhase && phase != "add")
        {
            _ = WebSocketMiddleware.BroadcastAsync("fun_retro_revealed", new { sessionId }, guestAllowed: true);
        }

        return await GetSessionAsync(sessionId, memberId);
    }

    public async Task<(bool success, string? error)> ToggleVoteAsync(Guid sessionId, Guid cardId, Guid memberId)
    {
        var card = await db.FunRetroCards
            .Include(c => c.Votes)
            .FirstOrDefaultAsync(c => c.Id == cardId && c.SessionId == sessionId);

        if (card is null) return (false, "Card not found.");

        var existingVote = card.Votes.FirstOrDefault(v => v.VoterId == memberId);
        if (existingVote is not null)
        {
            db.FunRetroVotes.Remove(existingVote);
        }
        else
        {
            // Check vote budget: max 3 votes per session
            var sessionVoteCount = await db.FunRetroVotes
                .CountAsync(v => v.Card.SessionId == sessionId && v.VoterId == memberId);

            if (sessionVoteCount >= 3)
                return (false, "Vote budget exhausted.");

            db.FunRetroVotes.Add(new FunRetroVote { CardId = cardId, VoterId = memberId });
        }

        await db.SaveChangesAsync();

        var voteCount = await db.FunRetroVotes.CountAsync(v => v.CardId == cardId);
        _ = WebSocketMiddleware.BroadcastAsync("fun_retro_voted", new { sessionId, cardId, voteCount }, guestAllowed: true);

        return (true, null);
    }

    public async Task<bool> ToggleReactionAsync(Guid sessionId, Guid cardId, Guid memberId, string emoji)
    {
        var card = await db.FunRetroCards
            .Include(c => c.Reactions)
            .FirstOrDefaultAsync(c => c.Id == cardId && c.SessionId == sessionId);

        if (card is null) return false;

        var existing = card.Reactions.FirstOrDefault(r => r.MemberId == memberId && r.Emoji == emoji);
        if (existing is not null)
        {
            db.FunRetroReactions.Remove(existing);
        }
        else
        {
            db.FunRetroReactions.Add(new FunRetroReaction
            {
                CardId = cardId,
                MemberId = memberId,
                Emoji = emoji,
            });
        }

        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("fun_retro_reacted", new { sessionId, cardId }, guestAllowed: true);

        return true;
    }

    public async Task<bool> UpdateCardTextAsync(Guid sessionId, Guid cardId, Guid memberId, string text)
    {
        var card = await db.FunRetroCards
            .FirstOrDefaultAsync(c => c.Id == cardId && c.SessionId == sessionId);
        if (card is null) return false;

        var session = await db.FunRetroSessions.FindAsync(sessionId);
        if (session is null) return false;

        // Only the card author or the session creator can edit text
        if (card.AuthorId != memberId && session.CreatedByMemberId != memberId) return false;

        card.Text = text.Trim();
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("fun_retro_card_text_updated", new { sessionId, cardId, text = card.Text }, guestAllowed: true);
        return true;
    }

    public async Task<bool> UpdateCardColorAsync(Guid sessionId, Guid cardId, string? color)
    {
        var card = await db.FunRetroCards
            .FirstOrDefaultAsync(c => c.Id == cardId && c.SessionId == sessionId);
        if (card is null) return false;

        card.Color = color;
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("fun_retro_card_color_changed", new { sessionId, cardId, color }, guestAllowed: true);
        return true;
    }

    public async Task<bool> UpdateCardPositionAsync(Guid sessionId, Guid cardId, double x, double y)
    {
        var card = await db.FunRetroCards
            .FirstOrDefaultAsync(c => c.Id == cardId && c.SessionId == sessionId);
        if (card is null) return false;

        card.PositionX = x;
        card.PositionY = y;
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("fun_retro_card_moved", new { sessionId, cardId, x, y }, guestAllowed: true);
        return true;
    }

    public async Task<bool> SetCardGroupAsync(Guid sessionId, Guid cardId, Guid? groupId)
    {
        var card = await db.FunRetroCards
            .FirstOrDefaultAsync(c => c.Id == cardId && c.SessionId == sessionId);
        if (card is null) return false;

        card.GroupId = groupId;
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("fun_retro_card_grouped", new { sessionId, cardId, groupId }, guestAllowed: true);
        return true;
    }

    public async Task<(bool success, string? error, FunRetroAnalysisDto? analysis)> AnalyseAsync(
        Guid sessionId, Guid memberId)
    {
        var session = await db.FunRetroSessions
            .Include(s => s.Cards)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return (false, "Session not found.", null);
        if (session.CreatedByMemberId != memberId) return (false, "Only the session host can trigger analysis.", null);

        var wellCards = session.Cards.Where(c => c.Column == "well").Select(c => c.Text).ToList();
        var betterCards = session.Cards.Where(c => c.Column == "better").Select(c => c.Text).ToList();
        var actionCards = session.Cards.Where(c => c.Column == "action").Select(c => c.Text).ToList();

        if (wellCards.Count + betterCards.Count + actionCards.Count == 0)
            return (false, "No cards to analyse.", null);

        var promptParams = new Dictionary<string, string>
        {
            ["wellCards"]   = string.Join(" | ", wellCards),
            ["betterCards"] = string.Join(" | ", betterCards),
            ["actionCards"] = string.Join(" | ", actionCards),
        };

        var raw = await aiExecutor.ExecuteAsync(
            "AnalyseRetroCards", promptParams,
            "FunRetroSession", $"Retro analysis for session {sessionId}",
            sessionId.ToString());

        if (raw is null) return (false, "AI analysis unavailable — configure an AnalyseRetroCards prompt to enable this feature.", null);

        var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        FunRetroAnalysisDto? analysis;
        try { analysis = JsonSerializer.Deserialize<FunRetroAnalysisDto>(raw, opts); }
        catch { return (false, "AI returned an unexpected format.", null); }

        if (analysis is null) return (false, "AI returned an empty response.", null);

        session.AiAnalysisJson = JsonSerializer.Serialize(analysis);
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastAsync("fun_retro_analysed", new { sessionId }, guestAllowed: true);

        return (true, null, analysis);
    }
}
