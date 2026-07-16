using System.Linq.Expressions;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.RetroBoard;
using TeamManager.Api.Application.Realtime;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Infrastructure.Slugs;
using static TeamManager.Api.Domain.Entities.RetroBoardConstants;

namespace TeamManager.Api.Application.Services;

/// <summary>
/// The structured, facilitated RetroBoard flow (setup → check-in → capture → introduce →
/// vote → discuss → reflect → summary). Separate from the legacy sprint retro and the
/// free-canvas FunRetro. Realtime updates are broadcast as <c>rb_*</c> events via
/// <see cref="IRetroBroadcaster"/> over the retro-session presence group.
///
/// The class is split across partial files by concern:
/// <list type="bullet">
/// <item><c>RetroBoardService.cs</c> — queries, the access guard, and shared helpers (this file)</item>
/// <item><c>RetroBoardService.Lifecycle.cs</c> — create/join/delete, phase, close/reopen/archive, AI</item>
/// <item><c>RetroBoardService.Board.cs</c> — columns, notes, votes (blocked once closed)</item>
/// <item><c>RetroBoardService.Engagement.cs</c> — check-in, feedback, actions, participants</item>
/// <item><c>RetroBoardService.Mapping.cs</c> — the read-side DTO projection and visibility policy</item>
/// </list>
///
/// Access model: every mutation runs through <see cref="GuardAsync"/>, which loads the session and
/// the caller's role in a single query and returns a <see cref="RetroActionResult"/> so the controller
/// maps outcomes to consistent HTTP status codes. Board mutations are rejected once a session is
/// closed; feedback, action items and lifecycle transitions are intentionally exempt.
/// </summary>
public partial class RetroBoardService(AppDbContext db, AiPromptExecutorService aiExecutor, IRetroBroadcaster broadcaster)
{
    private static readonly JsonSerializerOptions Json = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    private static readonly JsonSerializerOptions JsonRead = new() { PropertyNameCaseInsensitive = true };

    // ---------- Queries ----------

    /// <summary>Active (non-archived) sessions for the lobby — draft/live first, then recently closed.
    /// Note: this includes closed-but-not-archived sessions, so it is deliberately NOT "open only".</summary>
    public async Task<List<RetroBoardSummaryDto>> GetLobbySessionsAsync(Guid memberId)
    {
        return await db.RetroBoardSessions
            .Where(s => !s.IsArchived)
            // Draft/live sit above closed; within each group, newest first.
            .OrderBy(s => s.Status == Status.Closed ? 1 : 0)
            .ThenByDescending(s => s.CreatedAt)
            .Select(SummaryProjection(memberId))
            .ToListAsync();
    }

    /// <summary>Archived sessions, most-recently-archived first.</summary>
    public async Task<List<RetroBoardSummaryDto>> GetArchivedSessionsAsync(Guid memberId)
    {
        return await db.RetroBoardSessions
            .Where(s => s.IsArchived)
            .OrderByDescending(s => s.ArchivedAt)
            .Select(SummaryProjection(memberId))
            .ToListAsync();
    }

    private static Expression<Func<RetroBoardSession, RetroBoardSummaryDto>> SummaryProjection(Guid memberId) =>
        s => new RetroBoardSummaryDto
        {
            Id = s.Id,
            Title = s.Title,
            Slug = s.Slug,
            Phase = s.Phase,
            Status = s.Status,
            SquadName = s.Squad!.Name,
            CreatedByMemberId = s.CreatedByMemberId,
            CreatedByName = s.CreatedBy!.FirstName + " " + s.CreatedBy.LastName,
            IsFacilitator = s.CreatedByMemberId == memberId || s.Participants.Any(p => p.MemberId == memberId && p.Role == Role.Facilitator),
            IsArchived = s.IsArchived,
            ParticipantCount = s.Participants.Count,
            NoteCount = s.Notes.Count,
            CreatedAt = s.CreatedAt,
            ClosedAt = s.ClosedAt,
        };

    public async Task<Guid?> ResolveSessionIdAsync(string idOrSlug)
    {
        if (Guid.TryParse(idOrSlug, out var guid)) return guid;
        return await db.RetroBoardSessions
            .Where(s => s.Slug == idOrSlug)
            .Select(s => (Guid?)s.Id)
            .FirstOrDefaultAsync();
    }

    public async Task<RetroBoardSessionDto?> GetSessionAsync(Guid sessionId, Guid memberId)
    {
        var session = await LoadFullAsync(sessionId);
        return session is null ? null : ToDto(session, memberId);
    }

    // ---------- Access guard ----------

    /// <summary>The caller's access to a session, resolved in a single query.</summary>
    private sealed record Access(RetroBoardSession Session, bool IsFacilitator, bool IsParticipant)
    {
        public bool IsClosed => Session.Status == Status.Closed;
    }

    /// <summary>Loads the (tracked) session plus the caller's role in one round trip. The creator is
    /// always treated as an enrolled facilitator even without an explicit participant row.</summary>
    private async Task<Access?> LoadAccessAsync(Guid sessionId, Guid memberId)
    {
        var row = await db.RetroBoardSessions
            .Where(s => s.Id == sessionId)
            .Select(s => new
            {
                Session = s,
                IsCreator = s.CreatedByMemberId == memberId,
                MyRole = s.Participants.Where(p => p.MemberId == memberId).Select(p => p.Role).FirstOrDefault(),
            })
            .FirstOrDefaultAsync();
        if (row is null) return null;
        var isParticipant = row.IsCreator || row.MyRole != null;
        var isFacilitator = row.IsCreator || row.MyRole == Role.Facilitator;
        return new Access(row.Session, isFacilitator, isParticipant);
    }

    /// <summary>Single entry point for authorising a mutation. Returns the tracked session on
    /// <see cref="RetroActionResult.Ok"/>; otherwise the reason (NotFound / Forbidden / Closed).</summary>
    private async Task<(RetroActionResult result, RetroBoardSession? session)> GuardAsync(
        Guid sessionId, Guid memberId, bool facilitatorOnly, bool blockClosed)
    {
        var access = await LoadAccessAsync(sessionId, memberId);
        if (access is null) return (RetroActionResult.NotFound, null);
        var allowed = facilitatorOnly ? access.IsFacilitator : access.IsParticipant;
        if (!allowed) return (RetroActionResult.Forbidden, null);
        if (blockClosed && access.IsClosed) return (RetroActionResult.Closed, null);
        return (RetroActionResult.Ok, access.Session);
    }

    /// <summary>A note may be edited/cleared by its (non-anonymous) author or any facilitator.</summary>
    private async Task<bool> CanEditNoteAsync(Guid sessionId, Guid memberId, RetroBoardNote note)
    {
        if (note.AuthorMemberId == memberId) return true;
        var access = await LoadAccessAsync(sessionId, memberId);
        return access?.IsFacilitator ?? false;
    }

    // ---------- Shared helpers ----------

    private void Broadcast(Guid sessionId, string type, object? data = null) =>
        broadcaster.ToSession(sessionId, type, data);

    private static List<Guid> ParseAssignees(string? json) =>
        string.IsNullOrEmpty(json) ? [] : (JsonSerializer.Deserialize<List<Guid>>(json, JsonRead) ?? []);

    private async Task<List<RetroBoardCheckinQuestion>> SeedCheckinFromPreviousAsync(Guid squadId)
    {
        var prev = await db.RetroBoardSessions
            .Where(s => s.SquadId == squadId && s.Status == Status.Closed)
            .OrderByDescending(s => s.ClosedAt)
            .Include(s => s.Actions)
            .FirstOrDefaultAsync();
        if (prev is null) return [];

        return prev.Actions
            .Where(a => a.Status != "done")
            .Select((a, i) => new RetroBoardCheckinQuestion
            {
                Text = a.Title,
                ContextText = $"Last retro: {a.Title}",
                SourceActionId = a.Id,
                SortOrder = i,
            }).ToList();
    }

    private static List<RetroBoardColumn> DefaultColumns() =>
    [
        new() { Key = "well",   Label = "What Went Well",  Description = "Celebrate wins & strengths", Color = "#2fd47e", Icon = "spark", SortOrder = 0 },
        new() { Key = "better", Label = "What to Improve",  Description = "Things that could be better", Color = "#f4566b", Icon = "tri",   SortOrder = 1 },
        new() { Key = "quest",  Label = "Questions",        Description = "Seek clarity",                Color = "#f5b544", Icon = "quest", SortOrder = 2 },
        new() { Key = "shout",  Label = "Shout-outs",       Description = "Recognition & gratitude",     Color = "#5b9dff", Icon = "star",  SortOrder = 3 },
    ];

    // ---------- Session structure (per-phase config) ----------

    /// <summary>Only these phases can be toggled off; capture/vote/discuss/summary are the core loop.</summary>
    private static readonly string[] ConfigurablePhases = [Phase.Checkin, Phase.Introduce, Phase.Reflect];

    private static Dictionary<string, RetroPhaseFlags> ParsePhaseConfig(string? json) =>
        (string.IsNullOrEmpty(json) ? null : JsonSerializer.Deserialize<Dictionary<string, RetroPhaseFlags>>(json, JsonRead))
        ?? new Dictionary<string, RetroPhaseFlags>();

    private static RetroPhaseFlags FlagsFor(Dictionary<string, RetroPhaseFlags> cfg, string phase) =>
        cfg.TryGetValue(phase, out var f) ? f : new RetroPhaseFlags();

    /// <summary>Ordered live phases active this run (setup excluded): a phase is on when its config
    /// `enabled` holds AND its content requirement is met — check-in needs ≥1 question, reflect needs
    /// ≥1 prompt (auto-skip when empty, no toggle required). The single source of truth for the
    /// stepper, GoLive start phase, and phase advance.</summary>
    private static List<string> EnabledPhases(Dictionary<string, RetroPhaseFlags> cfg, bool hasCheckin, bool hasReflect)
    {
        bool On(string phase) => phase switch
        {
            Phase.Checkin => FlagsFor(cfg, phase).Enabled && hasCheckin,
            Phase.Reflect => FlagsFor(cfg, phase).Enabled && hasReflect,
            Phase.Introduce => FlagsFor(cfg, phase).Enabled,
            _ => true,
        };
        return Phase.Order.Where(p => p != Phase.Setup && On(p)).ToList();
    }

    private static List<RetroBoardFeedbackPrompt> DefaultFeedbackPrompts() =>
    [
        new() { Text = "Facilitation & presentation", SortOrder = 0 },
        new() { Text = "Flow & structure of the session", SortOrder = 1 },
        new() { Text = "Collaboration & participation", SortOrder = 2 },
    ];

    private async Task<string> GenerateUniqueSlugAsync()
    {
        for (var i = 0; i < 10; i++)
        {
            var candidate = SlugGenerator.Generate();
            if (!await db.RetroBoardSessions.AnyAsync(s => s.Slug == candidate)) return candidate;
        }
        return $"{SlugGenerator.Generate()}-{Guid.NewGuid().ToString()[..4]}";
    }
}
