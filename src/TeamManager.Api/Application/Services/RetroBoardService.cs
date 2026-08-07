using System.Linq.Expressions;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
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
public partial class RetroBoardService(
    AppDbContext db, AiPromptExecutorService aiExecutor, IRetroBroadcaster broadcaster, IServiceScopeFactory scopeFactory)
{
    private static readonly JsonSerializerOptions Json = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    private static readonly JsonSerializerOptions JsonRead = new() { PropertyNameCaseInsensitive = true };

    /// <summary>Longest note comment we store; anything longer is truncated, not rejected (matches the
    /// column length and the guest-name policy).</summary>
    public const int MaxCommentLength = 1000;

    /// <summary>How many of one voter's votes may land on a single topic — a loose note, or a whole
    /// group of merged notes (see RetroBoardService.Grouping).</summary>
    public const int MaxVotesPerTopic = 3;

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
            IsFacilitator = s.CreatedByMemberId == memberId || s.Participants.Any(p => p.MemberId == memberId && p.Role == Role.Facilitator && p.RemovedAt == null),
            IsArchived = s.IsArchived,
            ParticipantCount = s.Participants.Count(p => p.RemovedAt == null),
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
    /// always treated as an enrolled facilitator even without an explicit participant row. A removed
    /// participant (RemovedAt set) is deliberately not matched, so they read as un-enrolled and every
    /// mutation guard rejects them — the creator is exempt because they can never be removed.</summary>
    private async Task<Access?> LoadAccessAsync(Guid sessionId, Guid memberId)
    {
        var row = await db.RetroBoardSessions
            .Where(s => s.Id == sessionId)
            .Select(s => new
            {
                Session = s,
                IsCreator = s.CreatedByMemberId == memberId,
                MyRole = s.Participants.Where(p => p.MemberId == memberId && p.RemovedAt == null).Select(p => p.Role).FirstOrDefault(),
            })
            .FirstOrDefaultAsync();
        if (row is null) return null;
        var isParticipant = row.IsCreator || row.MyRole != null;
        var isFacilitator = row.IsCreator || row.MyRole == Role.Facilitator;
        return new Access(row.Session, isFacilitator, isParticipant);
    }

    // ---------- Phase gating ----------

    /// <summary>The step of the retro decides what anyone may contribute, member or guest alike. Notes
    /// belong to pre-capture (status <c>open</c>) and the Capture phase; votes to the Vote phase;
    /// comments to the phases where a note is being read and talked about. Once the facilitator moves
    /// on, the board is read-only for that kind of contribution — this is what stops someone quietly
    /// adding a note or a vote while the team is in Discuss.
    ///
    /// Enforced here rather than only in the UI, because both boards refetch asynchronously: a stale
    /// tab, a slow WebSocket, or a direct API call would otherwise sail straight past a hidden button.
    /// Facilitators are exempt for notes and comments only (housekeeping mid-discussion); voting is
    /// gated for everyone, since an out-of-phase vote skews the result the team is looking at.</summary>
    private static bool CanAddNotes(RetroBoardSession s) =>
        s.Status == Status.Open || (s.Status == Status.Live && s.Phase == Phase.Capture);

    private static bool CanVote(RetroBoardSession s) =>
        s.Status == Status.Live && s.Phase == Phase.Vote;

    /// <summary>Comments are the "add context without adding another sticky" affordance, so they're
    /// open across the phases where notes are being written, read out and discussed.</summary>
    private static bool CanComment(RetroBoardSession s) =>
        s.Status == Status.Open
        || (s.Status == Status.Live && s.Phase is Phase.Capture or Phase.Introduce or Phase.Discuss);

    /// <summary>Merging near-duplicates belongs to the read-and-talk half of the retro: Introduce (as
    /// the facilitator reads them out and spots the same idea three times), Vote (consolidating right
    /// before or during voting is when it matters most — see the Fun Retro rationale in #203), and
    /// Discuss (merging two topics that turned out to be one). Not during Capture: notes are still
    /// arriving and half of them are masked until reveal.</summary>
    private static bool CanGroup(RetroBoardSession s) =>
        s.Status == Status.Live && s.Phase is Phase.Introduce or Phase.Vote or Phase.Discuss;

    /// <summary>Message shown when a contribution arrives out of phase — names the step it belongs to
    /// so the board can explain itself rather than showing a bare conflict.</summary>
    private const string NotesClosedError = "Notes can only be added during Capture.";
    private const string VotingClosedError = "Voting is only open during the Vote step.";
    private const string CommentsClosedError = "Comments are open during Capture, Introduce and Discuss.";
    private const string GroupingClosedError = "Notes can be grouped during Introduce, Vote and Discuss.";

    /// <summary>Single entry point for authorising a mutation. Returns the tracked session on
    /// <see cref="RetroActionResult.Ok"/>; otherwise the reason (NotFound / Forbidden / Closed).</summary>
    private async Task<(RetroActionResult result, RetroBoardSession? session)> GuardAsync(
        Guid sessionId, Guid memberId, bool facilitatorOnly, bool blockClosed)
    {
        var (result, access) = await GuardAccessAsync(sessionId, memberId, facilitatorOnly, blockClosed);
        return (result, access?.Session);
    }

    /// <summary>As <see cref="GuardAsync"/>, but hands back the whole <see cref="Access"/> — use it when
    /// the caller also needs to know whether they're a facilitator (e.g. the phase gates, which exempt
    /// the host) instead of re-querying the role.</summary>
    private async Task<(RetroActionResult result, Access? access)> GuardAccessAsync(
        Guid sessionId, Guid memberId, bool facilitatorOnly, bool blockClosed)
    {
        var access = await LoadAccessAsync(sessionId, memberId);
        if (access is null) return (RetroActionResult.NotFound, null);
        var allowed = facilitatorOnly ? access.IsFacilitator : access.IsParticipant;
        if (!allowed) return (RetroActionResult.Forbidden, null);
        if (blockClosed && access.IsClosed) return (RetroActionResult.Closed, null);
        return (RetroActionResult.Ok, access);
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
