using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.FunRetro;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Infrastructure.Slugs;
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
            HideCardsOnAdd = req.HideCardsOnAdd,
            // Vote caps: null VotesPerUser = unlimited; otherwise clamp to a sane 1..99. Per-card
            // cap defaults to 1 (today's toggle) and is bounded by the session budget when set.
            VotesPerUser = req.VotesPerUser is { } vpu ? Math.Clamp(vpu, 1, 99) : null,
            MaxVotesPerCard = Math.Clamp(req.MaxVotesPerCard, 1, req.VotesPerUser is { } b ? Math.Clamp(b, 1, 99) : 99),
            StepDurationsJson = req.StepDurations is { } sd && (sd.Add is > 0 || sd.Vote is > 0 || sd.Discuss is > 0)
                ? JsonSerializer.Serialize(sd, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
                : null,
            CheckinEnabled = req.CheckinEnabled,
            Slug = await GenerateUniqueSlugAsync(),
        };

        // Seed the check-in from the creator's most recent finished retro's open action cards, so
        // the team can rate how last time's action items are going. Carry-forward keys off the
        // creator (FunRetro has no squad anchor).
        if (req.CheckinEnabled)
            session.CheckinQuestions = await SeedCheckinFromPreviousAsync(memberId);

        db.FunRetroSessions.Add(session);
        await db.SaveChangesAsync();

        return (await GetSessionAsync(session.Id, memberId))!;
    }

    /// <summary>Retries a handful of times on a rare collision instead of failing the
    /// create outright -- the wordlist is large enough that a retry essentially never
    /// happens in practice, but a session should never fail to create over a naming clash.</summary>
    private async Task<string> GenerateUniqueSlugAsync()
    {
        for (var attempt = 0; attempt < 5; attempt++)
        {
            var candidate = SlugGenerator.Generate();
            if (!await db.FunRetroSessions.AnyAsync(s => s.Slug == candidate)) return candidate;
        }
        // Vanishingly unlikely to be reached given the wordlist size, but a session must
        // still get *some* slug rather than fail outright -- fall back to a guaranteed-unique one.
        return $"{SlugGenerator.Generate()}-{Guid.NewGuid().ToString()[..4]}";
    }

    /// <summary>Resolves a share-URL path segment to the session's real id -- either a raw
    /// GUID (older links, or an API caller that already has the id) or a friendly slug.</summary>
    public async Task<Guid?> ResolveSessionIdAsync(string idOrSlug)
    {
        if (Guid.TryParse(idOrSlug, out var guid)) return guid;
        return await db.FunRetroSessions
            .Where(s => s.Slug == idOrSlug)
            .Select(s => (Guid?)s.Id)
            .FirstOrDefaultAsync();
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
            .Include(s => s.Cards)
                .ThenInclude(c => c.Comments)
            .Include(s => s.Tokens)
            .Include(s => s.CheckinQuestions)
                .ThenInclude(q => q.Responses)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return null;

        // Sessions created before slugs existed have a null Slug -- assign one lazily here
        // instead of a data migration, so re-sharing an old session's link still upgrades
        // it to a friendly URL going forward.
        if (session.Slug is null)
        {
            session.Slug = await GenerateUniqueSlugAsync();
            await db.SaveChangesAsync();
        }

        var isCreator = session.CreatedByMemberId == memberId;
        var totalCardCount = session.Cards.Count;

        // Cards are hidden only during the add phase, and only when the session was created with
        // HideCardsOnAdd. Leaving the add phase (e.g. moving to voting) reveals everything, as does
        // the creator's manual one-shot reveal. Your own cards are always visible to you.
        var isAddPhase = session.Phase == "add";

        // Resolve action-card assignees to names/avatars in one lookup across all cards.
        var assigneeIds = session.Cards
            .SelectMany(c => ParseGuidList(c.AssigneeMemberIdsJson))
            .Distinct()
            .ToList();
        var assigneeLookup = assigneeIds.Count == 0
            ? new Dictionary<Guid, FunRetroAssigneeDto>()
            : await db.TeamMembers
                .Where(m => assigneeIds.Contains(m.Id))
                .Select(m => new FunRetroAssigneeDto { MemberId = m.Id, Name = (m.FirstName + " " + m.LastName).Trim(), AvatarSeed = m.AvatarSeed })
                .ToDictionaryAsync(m => m.MemberId);

        var cardDtos = session.Cards
            .OrderBy(c => c.CreatedAt)
            .Select(c =>
            {
                var isOwn = c.AuthorId == memberId;
                var hideContent = isAddPhase && !isOwn && session.HideCardsOnAdd && !session.ManuallyRevealed;

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
                    CommentCount = c.Comments.Count,
                    Assignees = ParseGuidList(c.AssigneeMemberIdsJson)
                        .Where(assigneeLookup.ContainsKey)
                        .Select(id => assigneeLookup[id])
                        .ToList(),
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
            Slug = session.Slug,
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
            ManuallyRevealed = session.ManuallyRevealed,
            ParticipationTracking = session.ParticipationTracking,
            Theme = session.Theme,
            CanvasLayout = session.CanvasLayout,
            VotesPerUser = session.VotesPerUser,
            MaxVotesPerCard = session.MaxVotesPerCard,
            MyVotesUsed = session.Cards.Sum(c => c.Votes.Count(v => v.VoterId == memberId)),
            StepDurations = string.IsNullOrEmpty(session.StepDurationsJson)
                ? null
                : JsonSerializer.Deserialize<FunRetroStepDurations>(session.StepDurationsJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }),
            CheckinEnabled = session.CheckinEnabled,
            CheckinQuestions = session.CheckinQuestions
                .OrderBy(q => q.SortOrder)
                .Select(q => new FunRetroCheckinQuestionDto
                {
                    Id = q.Id,
                    Text = q.Text,
                    ContextText = q.ContextText,
                    SortOrder = q.SortOrder,
                    MyRating = q.Responses.FirstOrDefault(r => r.MemberId == memberId)?.Rating,
                    Better = q.Responses.Count(r => r.Rating == "better"),
                    Same = q.Responses.Count(r => r.Rating == "same"),
                    Worse = q.Responses.Count(r => r.Rating == "worse"),
                    Na = q.Responses.Count(r => r.Rating == "na"),
                })
                .ToList(),
            Tokens = session.Tokens
                .OrderBy(t => t.CreatedAt)
                .Select(t => new FunRetroTokenDto
                {
                    Id = t.Id,
                    SessionId = t.SessionId,
                    Column = t.Column,
                    Emoji = t.Emoji,
                    Size = t.Size,
                    PositionX = t.PositionX,
                    PositionY = t.PositionY,
                    CreatedByMemberId = t.CreatedByMemberId,
                    CreatedAt = t.CreatedAt,
                })
                .ToList(),
        };
    }

    /// <summary>theme is either one of the fixed built-in ids or a RetroCustomTheme's Guid (as a
    /// string) from the shared library -- resolved with a DB lookup since the library is open-
    /// ended, unlike the fixed HashSet. An unrecognized id (typo, stale client, deleted library
    /// theme) is dropped to null rather than persisted, same as the old fixed-enum behavior.</summary>
    public async Task<bool> UpdateSettingsAsync(Guid sessionId, Guid memberId, bool participationTracking, string? theme)
    {
        var session = await db.FunRetroSessions.FindAsync(sessionId);
        if (session is null || session.CreatedByMemberId != memberId) return false;

        var validTheme = await ResolveThemeAsync(theme);
        session.ParticipationTracking = participationTracking;
        session.Theme = validTheme;
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_settings_updated", sessionId.ToString(),
            new { sessionId, participationTracking, theme = validTheme });
        return true;
    }

    private async Task<string?> ResolveThemeAsync(string? theme)
    {
        if (theme is null) return null;
        if (ValidThemes.Contains(theme)) return theme;
        return Guid.TryParse(theme, out var themeId) && await db.RetroCustomThemes.AnyAsync(t => t.Id == themeId)
            ? theme
            : null;
    }

    /// <summary>Creator-only one-shot override: reveals every card immediately (including
    /// ones added afterward, for the rest of this "add" phase) without touching the persistent
    /// HideCardsOnAdd setting or advancing the phase. This is the "lock" the host clicks on the
    /// canvas control panel to unlock cards early.</summary>
    public async Task<bool> RevealAllNowAsync(Guid sessionId, Guid memberId)
    {
        var session = await db.FunRetroSessions.FindAsync(sessionId);
        if (session is null || session.CreatedByMemberId != memberId) return false;
        if (session.ManuallyRevealed) return true; // already revealed, nothing to do

        session.ManuallyRevealed = true;
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_revealed", sessionId.ToString(), new { sessionId });
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

    public async Task<bool> SetTimerAsync(Guid sessionId, Guid memberId, string? timerJson)
    {
        var session = await db.FunRetroSessions.FindAsync(sessionId);
        if (session is null) return false;
        if (session.CreatedByMemberId != memberId) return false;

        // Timer state (start/pause/reset) and widget position are set through separate calls,
        // but both live in the same TimerJson blob -- carry the position forward here so a
        // plain start/pause doesn't blow away where the widget was last dragged to.
        if (timerJson is not null && !string.IsNullOrEmpty(session.TimerJson))
        {
            var existing = System.Text.Json.Nodes.JsonNode.Parse(session.TimerJson)?.AsObject();
            var positionX = existing?["positionX"];
            var positionY = existing?["positionY"];
            if (positionX is not null && positionY is not null)
            {
                var node = System.Text.Json.Nodes.JsonNode.Parse(timerJson)!.AsObject();
                node["positionX"] = positionX.DeepClone();
                node["positionY"] = positionY.DeepClone();
                timerJson = node.ToJsonString();
            }
        }

        session.TimerJson = timerJson;
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_timer_updated", sessionId.ToString(), new { sessionId, timerJson });
        return true;
    }

    public async Task<bool> UpdateTimerPositionAsync(Guid sessionId, double x, double y)
    {
        var session = await db.FunRetroSessions.FindAsync(sessionId);
        if (session is null) return false;

        // Merge into whatever timer state already exists (running/paused/seconds) rather than
        // going through TimerRequest, since repositioning the widget shouldn't touch those fields.
        var node = string.IsNullOrEmpty(session.TimerJson)
            ? new System.Text.Json.Nodes.JsonObject()
            : System.Text.Json.Nodes.JsonNode.Parse(session.TimerJson)!.AsObject();
        node["positionX"] = x;
        node["positionY"] = y;
        var timerJson = node.ToJsonString();

        session.TimerJson = timerJson;
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_timer_updated", sessionId.ToString(), new { sessionId, timerJson });
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

        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_icebreaker_answered", sessionId.ToString(),
            new { sessionId, memberId, memberName, answer });

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
            PositionX = req.PositionX,
            PositionY = req.PositionY,
        };

        db.FunRetroCards.Add(card);
        await db.SaveChangesAsync();

        var count = await db.FunRetroCards.CountAsync(c => c.SessionId == sessionId);

        // Broadcast the actual card so other participants append it directly instead of every one
        // of them refetching the whole session (the old {count}-only payload forced an N-client
        // GET storm on every single card -- a prime source of the refetch races). Redact text the
        // same way GetSession would for a viewer who isn't the author: during a hidden add phase a
        // card comes across as a locked placeholder. AuthorName is always sent (participation is
        // visible even while text is hidden). IsOwn is left false here and recomputed per-viewer on
        // the client from authorId; the author's own client already has the card from its POST
        // response, so it dedupes this by id.
        var hidden = session.HideCardsOnAdd && session.Phase == "add" && !session.ManuallyRevealed;
        var cardDto = new FunRetroCardDto
        {
            Id = card.Id,
            SessionId = sessionId,
            Column = card.Column,
            Text = hidden ? null : card.Text,
            AuthorName = card.AuthorName,
            AuthorId = card.AuthorId,
            AuthorAvatarSeed = member.AvatarSeed,
            IsOwn = false,
            CreatedAt = card.CreatedAt,
            VoteCount = 0,
            MyVoteCount = 0,
            Reactions = [],
            PositionX = card.PositionX,
            PositionY = card.PositionY,
            Color = card.Color,
            GroupId = card.GroupId,
            CommentCount = 0,
        };
        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_card_added", sessionId.ToString(),
            new { sessionId, count, card = cardDto });

        return await GetSessionAsync(sessionId, memberId);
    }

    /// <summary>Set the assignees on an action card (multi-assignee, ported from RetroBoard). The
    /// card author or the session creator may edit assignees. Invalid/unknown member ids are dropped.</summary>
    public async Task<(bool ok, string? error)> SetAssigneesAsync(Guid sessionId, Guid cardId, Guid memberId, List<Guid> memberIds)
    {
        var card = await db.FunRetroCards
            .Include(c => c.Session)
            .FirstOrDefaultAsync(c => c.Id == cardId && c.SessionId == sessionId);
        if (card is null) return (false, "Card not found.");
        if (card.AuthorId != memberId && card.Session.CreatedByMemberId != memberId)
            return (false, "Only the card author or the retro creator can assign this card.");

        var valid = memberIds.Count == 0
            ? new List<Guid>()
            : await db.TeamMembers.Where(m => memberIds.Contains(m.Id)).Select(m => m.Id).ToListAsync();
        card.AssigneeMemberIdsJson = valid.Count == 0
            ? null
            : JsonSerializer.Serialize(valid, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_card_updated", sessionId.ToString(), new { sessionId, cardId });
        return (true, null);
    }

    private static List<Guid> ParseGuidList(string? json)
    {
        if (string.IsNullOrEmpty(json)) return [];
        try { return JsonSerializer.Deserialize<List<Guid>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? []; }
        catch { return []; }
    }

    // ── Check-in ──

    /// <summary>Carry forward the creator's last finished retro's open action cards as check-in
    /// questions. "Finished" = phase "done"; "open" = an action card whose text isn't struck out.</summary>
    private async Task<List<FunRetroCheckinQuestion>> SeedCheckinFromPreviousAsync(Guid creatorId)
    {
        var prev = await db.FunRetroSessions
            .Where(s => s.CreatedByMemberId == creatorId && s.Phase == "done")
            .OrderByDescending(s => s.CreatedAt)
            .Include(s => s.Cards)
            .FirstOrDefaultAsync();
        if (prev is null) return [];

        return prev.Cards
            .Where(c => c.Column == "action" && !string.IsNullOrWhiteSpace(c.Text))
            .OrderBy(c => c.CreatedAt)
            .Select((c, i) => new FunRetroCheckinQuestion
            {
                Text = c.Text.Trim(),
                ContextText = "From your last retro",
                SourceCardId = c.Id,
                SortOrder = i,
            })
            .ToList();
    }

    public async Task<FunRetroCheckinQuestionDto?> AddCheckinQuestionAsync(Guid sessionId, Guid memberId, AddFunRetroCheckinQuestionRequest req)
    {
        var session = await db.FunRetroSessions.FindAsync(sessionId);
        if (session is null || session.CreatedByMemberId != memberId || string.IsNullOrWhiteSpace(req.Text)) return null;

        var order = (await db.FunRetroCheckinQuestions.Where(q => q.SessionId == sessionId).MaxAsync(q => (int?)q.SortOrder) ?? -1) + 1;
        var q = new FunRetroCheckinQuestion
        {
            SessionId = sessionId,
            Text = req.Text.Trim(),
            ContextText = string.IsNullOrWhiteSpace(req.ContextText) ? null : req.ContextText.Trim(),
            SortOrder = order,
        };
        db.FunRetroCheckinQuestions.Add(q);
        await db.SaveChangesAsync();
        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_checkin_changed", sessionId.ToString(), new { sessionId });
        return new FunRetroCheckinQuestionDto { Id = q.Id, Text = q.Text, ContextText = q.ContextText, SortOrder = q.SortOrder };
    }

    public async Task<bool> DeleteCheckinQuestionAsync(Guid sessionId, Guid memberId, Guid questionId)
    {
        var session = await db.FunRetroSessions.FindAsync(sessionId);
        if (session is null || session.CreatedByMemberId != memberId) return false;
        var q = await db.FunRetroCheckinQuestions.FirstOrDefaultAsync(x => x.Id == questionId && x.SessionId == sessionId);
        if (q is null) return false;
        db.FunRetroCheckinQuestions.Remove(q);
        await db.SaveChangesAsync();
        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_checkin_changed", sessionId.ToString(), new { sessionId });
        return true;
    }

    public async Task<bool> RespondCheckinAsync(Guid sessionId, Guid memberId, Guid questionId, string rating)
    {
        string[] valid = ["better", "same", "worse", "na"];
        if (!valid.Contains(rating)) return false;
        var exists = await db.FunRetroCheckinQuestions.AnyAsync(q => q.Id == questionId && q.SessionId == sessionId);
        if (!exists) return false;

        var existing = await db.FunRetroCheckinResponses.FirstOrDefaultAsync(r => r.QuestionId == questionId && r.MemberId == memberId);
        if (existing is null)
            db.FunRetroCheckinResponses.Add(new FunRetroCheckinResponse { QuestionId = questionId, MemberId = memberId, Rating = rating });
        else
            existing.Rating = rating;
        await db.SaveChangesAsync();
        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_checkin_responded", sessionId.ToString(), new { sessionId, questionId });
        return true;
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

        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_phase_changed", sessionId.ToString(), new { sessionId, phase });

        if (wasAddPhase && phase != "add")
        {
            _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_revealed", sessionId.ToString(), new { sessionId });
        }

        return await GetSessionAsync(sessionId, memberId);
    }

    /// <summary>Add or remove one of the caller's votes on a card. <paramref name="remove"/> false
    /// adds a vote (honouring the per-card and per-session caps); true removes one. A per-card cap of
    /// 1 with the +/- buttons preserves the classic one-vote-per-card behaviour.</summary>
    public async Task<(bool success, string? error)> ToggleVoteAsync(Guid sessionId, Guid cardId, Guid memberId, bool remove = false)
    {
        var session = await db.FunRetroSessions.FindAsync(sessionId);
        if (session is null) return (false, "Session not found.");

        var card = await db.FunRetroCards
            .Include(c => c.Votes)
            .FirstOrDefaultAsync(c => c.Id == cardId && c.SessionId == sessionId);

        if (card is null) return (false, "Card not found.");

        var myVotesOnCard = card.Votes.Where(v => v.VoterId == memberId).ToList();
        if (remove)
        {
            if (myVotesOnCard.Count == 0) return (true, null); // nothing to remove
            db.FunRetroVotes.Remove(myVotesOnCard[0]);
        }
        else
        {
            // Per-card cap (default 1) and the session budget (null = unlimited).
            if (myVotesOnCard.Count >= session.MaxVotesPerCard)
                return (false, "Max votes on this card reached.");

            var sessionVoteCount = await db.FunRetroVotes
                .CountAsync(v => v.Card.SessionId == sessionId && v.VoterId == memberId);
            if (session.VotesPerUser is { } budget && sessionVoteCount >= budget)
                return (false, "Vote budget exhausted.");

            db.FunRetroVotes.Add(new FunRetroVote { CardId = cardId, VoterId = memberId });
        }

        await db.SaveChangesAsync();

        var voteCount = await db.FunRetroVotes.CountAsync(v => v.CardId == cardId);
        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_voted", sessionId.ToString(), new { sessionId, cardId, voteCount });

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

        // Send the card's per-emoji totals so clients update counts in place instead of refetching
        // the whole session. `mine` is per-viewer and deliberately omitted -- each client keeps its
        // own mine flags (the reactor already toggled its own optimistically); everyone just applies
        // the authoritative counts.
        var reactionCounts = await db.FunRetroReactions
            .Where(r => r.CardId == cardId)
            .GroupBy(r => r.Emoji)
            .Select(g => new { emoji = g.Key, count = g.Count() })
            .ToListAsync();
        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_reacted", sessionId.ToString(),
            new { sessionId, cardId, reactions = reactionCounts });

        return true;
    }

    public async Task<List<FunRetroCardCommentDto>> GetCardCommentsAsync(Guid sessionId, Guid cardId)
    {
        var exists = await db.FunRetroCards.AnyAsync(c => c.Id == cardId && c.SessionId == sessionId);
        if (!exists) return [];

        return await db.FunRetroCardComments
            .Where(c => c.CardId == cardId)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new FunRetroCardCommentDto
            {
                Id = c.Id,
                CardId = c.CardId,
                AuthorId = c.AuthorId,
                AuthorName = c.AuthorName,
                Text = c.Text,
                CreatedAt = c.CreatedAt,
            })
            .ToListAsync();
    }

    public async Task<FunRetroCardCommentDto?> AddCardCommentAsync(Guid sessionId, Guid cardId, Guid memberId, string text)
    {
        var trimmed = text.Trim();
        if (string.IsNullOrEmpty(trimmed)) return null;

        var card = await db.FunRetroCards.FirstOrDefaultAsync(c => c.Id == cardId && c.SessionId == sessionId);
        if (card is null) return null;

        var member = await db.TeamMembers.FindAsync(memberId);
        if (member is null) return null;

        var comment = new FunRetroCardComment
        {
            CardId = cardId,
            AuthorId = memberId,
            AuthorName = $"{member.FirstName} {member.LastName}".Trim(),
            Text = trimmed,
        };
        db.FunRetroCardComments.Add(comment);
        await db.SaveChangesAsync();

        var count = await db.FunRetroCardComments.CountAsync(c => c.CardId == cardId);
        var dto = new FunRetroCardCommentDto
        {
            Id = comment.Id,
            CardId = cardId,
            AuthorId = memberId,
            AuthorName = comment.AuthorName,
            Text = comment.Text,
            CreatedAt = comment.CreatedAt,
        };

        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_comment_added", sessionId.ToString(),
            new { sessionId, cardId, commentCount = count, comment = dto });

        return dto;
    }

    public async Task<bool> DeleteCardCommentAsync(Guid sessionId, Guid cardId, Guid commentId, Guid memberId)
    {
        var comment = await db.FunRetroCardComments
            .Include(c => c.Card).ThenInclude(card => card.Session)
            .FirstOrDefaultAsync(c => c.Id == commentId && c.CardId == cardId && c.Card.SessionId == sessionId);
        if (comment is null) return false;

        var isAuthor = comment.AuthorId == memberId;
        var isHost = comment.Card.Session.CreatedByMemberId == memberId;
        if (!isAuthor && !isHost) return false;

        db.FunRetroCardComments.Remove(comment);
        await db.SaveChangesAsync();

        var count = await db.FunRetroCardComments.CountAsync(c => c.CardId == cardId);
        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_comment_deleted", sessionId.ToString(),
            new { sessionId, cardId, commentId, commentCount = count });
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

        // Redact exactly as card_added and GetSession do: during a hidden add phase a card is a
        // locked placeholder to everyone but its author, so the edited text must NOT go out on the
        // wire to other viewers -- otherwise every keystroke-save leaks hidden content. The author's
        // own client already applied the text optimistically (saveCardText), and the client handler
        // ignores a null text for a card it authored, so masking here doesn't blank the author.
        var hidden = session.HideCardsOnAdd && session.Phase == "add" && !session.ManuallyRevealed;
        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_card_text_updated", sessionId.ToString(),
            new { sessionId, cardId, text = hidden ? null : card.Text });
        return true;
    }

    public async Task<bool> UpdateCardColorAsync(Guid sessionId, Guid cardId, string? color)
    {
        var card = await db.FunRetroCards
            .FirstOrDefaultAsync(c => c.Id == cardId && c.SessionId == sessionId);
        if (card is null) return false;

        card.Color = color;
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_card_color_changed", sessionId.ToString(), new { sessionId, cardId, color });
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

        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_card_moved", sessionId.ToString(), new { sessionId, cardId, x, y });
        return true;
    }

    public async Task<FunRetroTokenDto?> AddTokenAsync(Guid sessionId, Guid memberId, string column, string emoji, string size, double x, double y)
    {
        if (string.IsNullOrWhiteSpace(emoji)) return null;
        var session = await db.FunRetroSessions.FindAsync(sessionId);
        if (session is null) return null;

        var token = new FunRetroToken
        {
            SessionId = sessionId,
            Column = column,
            Emoji = emoji,
            Size = size,
            PositionX = x,
            PositionY = y,
            CreatedByMemberId = memberId,
        };
        db.FunRetroTokens.Add(token);
        await db.SaveChangesAsync();

        var dto = new FunRetroTokenDto
        {
            Id = token.Id,
            SessionId = sessionId,
            Column = column,
            Emoji = emoji,
            Size = size,
            PositionX = x,
            PositionY = y,
            CreatedByMemberId = memberId,
            CreatedAt = token.CreatedAt,
        };

        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_token_added", sessionId.ToString(), new { sessionId, token = dto });
        return dto;
    }

    public async Task<bool> UpdateTokenPositionAsync(Guid sessionId, Guid tokenId, double x, double y)
    {
        var token = await db.FunRetroTokens
            .FirstOrDefaultAsync(t => t.Id == tokenId && t.SessionId == sessionId);
        if (token is null) return false;

        token.PositionX = x;
        token.PositionY = y;
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_token_moved", sessionId.ToString(), new { sessionId, tokenId, x, y });
        return true;
    }

    public async Task<bool> UpdateTokenSizeAsync(Guid sessionId, Guid tokenId, string size)
    {
        var token = await db.FunRetroTokens
            .FirstOrDefaultAsync(t => t.Id == tokenId && t.SessionId == sessionId);
        if (token is null) return false;

        token.Size = size;
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_token_resized", sessionId.ToString(), new { sessionId, tokenId, size });
        return true;
    }

    public async Task<bool> DeleteTokenAsync(Guid sessionId, Guid tokenId, Guid memberId)
    {
        var token = await db.FunRetroTokens
            .Include(t => t.Session)
            .FirstOrDefaultAsync(t => t.Id == tokenId && t.SessionId == sessionId);
        if (token is null) return false;

        var isOwn = token.CreatedByMemberId == memberId;
        var isCreator = token.Session.CreatedByMemberId == memberId;
        if (!isOwn && !isCreator) return false;

        db.FunRetroTokens.Remove(token);
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_token_deleted", sessionId.ToString(), new { sessionId, tokenId });
        return true;
    }

    public async Task<bool> SetCardGroupAsync(Guid sessionId, Guid cardId, Guid? groupId)
    {
        var card = await db.FunRetroCards
            .FirstOrDefaultAsync(c => c.Id == cardId && c.SessionId == sessionId);
        if (card is null) return false;

        card.GroupId = groupId;
        await db.SaveChangesAsync();

        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_card_grouped", sessionId.ToString(), new { sessionId, cardId, groupId });
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

        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync("fun_retro_analysed", sessionId.ToString(), new { sessionId });

        return (true, null, analysis);
    }
}
