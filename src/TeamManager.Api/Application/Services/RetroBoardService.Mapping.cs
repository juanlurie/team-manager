using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.RetroBoard;
using TeamManager.Api.Domain.Entities;
using static TeamManager.Api.Domain.Entities.RetroBoardConstants;

namespace TeamManager.Api.Application.Services;

// Read-side mapping: loading the full session graph and projecting it to DTOs, including the
// note-visibility and feedback-anonymity policies. Kept separate from the mutation surface.
public partial class RetroBoardService
{
    /// <summary>In-memory "is this member a facilitator" check for a loaded session (single source of
    /// truth for the imperative paths; the EF projection mirrors the same rule in expression form).</summary>
    private static bool IsFacilitator(RetroBoardSession s, Guid memberId) =>
        s.CreatedByMemberId == memberId || s.Participants.Any(p => p.MemberId == memberId && p.Role == Role.Facilitator);

    /// <summary>Visibility policy for a single note: during Capture, others' notes stay hidden until the
    /// global reveal (facilitators always see through). This is the one place that rule lives.</summary>
    private static bool IsNoteHidden(RetroBoardNote n, bool isOwn, bool isFacilitator, bool hideOthers) =>
        hideOthers && !isFacilitator && !isOwn;

    private Task<RetroBoardSession?> LoadFullAsync(Guid sessionId) =>
        db.RetroBoardSessions
            .AsNoTracking()   // read-only path — the full graph is materialised only to project into the DTO
            .Include(s => s.Squad)
            .Include(s => s.Sprint)
            .Include(s => s.Columns)
            .Include(s => s.Notes).ThenInclude(n => n.Author)
            .Include(s => s.Notes).ThenInclude(n => n.Votes)
            .Include(s => s.CheckinQuestions).ThenInclude(q => q.Responses)
            .Include(s => s.Participants).ThenInclude(p => p.Member)
            .Include(s => s.Actions).ThenInclude(a => a.Owner)
            .Include(s => s.FeedbackPrompts).ThenInclude(p => p.Responses)
            .AsSplitQuery()
            .FirstOrDefaultAsync(s => s.Id == sessionId);

    private async Task<RetroBoardActionDto?> MapActionAsync(Guid actionId)
    {
        var a = await db.RetroBoardActions.AsNoTracking().Include(x => x.Owner).FirstOrDefaultAsync(x => x.Id == actionId);
        return a is null ? null : MapAction(a);
    }

    /// <summary>Single mapping for RetroBoardAction → DTO, shared by MapActionAsync and ToDto.
    /// Requires the Owner navigation to be loaded.</summary>
    private static RetroBoardActionDto MapAction(RetroBoardAction a) => new()
    {
        Id = a.Id, SourceNoteId = a.SourceNoteId, Title = a.Title, OwnerMemberId = a.OwnerMemberId,
        OwnerName = a.Owner is null ? null : $"{a.Owner.FirstName} {a.Owner.LastName}".Trim(),
        AssigneeMemberIds = ParseAssignees(a.AssigneeMemberIdsJson),
        Status = a.Status, DueDate = a.DueDate, IsAiSuggested = a.IsAiSuggested,
    };

    /// <summary>Maps a feedback prompt to its DTO and applies the anonymity policy: the aggregate
    /// (scores, distribution, comments) is exposed ONLY to facilitators; everyone else sees just their
    /// own response. This is the single source of truth for that rule — do not re-implement it inline.
    /// Requires the Responses navigation to be loaded.</summary>
    private static RetroBoardFeedbackPromptDto MapFeedbackPrompt(RetroBoardFeedbackPrompt p, Guid? memberId, bool isFacilitator)
    {
        var mine = p.Responses.FirstOrDefault(r => r.MemberId == memberId);
        var scored = isFacilitator ? p.Responses.Where(r => r.Score is >= 1 and <= 5).ToList() : [];
        var dist = new List<int> { 0, 0, 0, 0, 0 };
        foreach (var r in scored) dist[r.Score - 1]++;
        return new RetroBoardFeedbackPromptDto
        {
            Id = p.Id, Text = p.Text, SortOrder = p.SortOrder,
            MyScore = mine?.Score, MyComment = mine?.Comment,
            ResponseCount = scored.Count,
            AverageScore = scored.Count == 0 ? null : Math.Round(scored.Average(r => r.Score), 2),
            Distribution = dist,
            // Anonymous + order-decoupled from ratings, but STABLE across refetches (ordered by the
            // response's own id, not a fresh Guid each fetch) so comments don't jump around live.
            Comments = isFacilitator
                ? p.Responses.Where(r => !string.IsNullOrWhiteSpace(r.Comment))
                    .OrderBy(r => r.Id).Select(r => r.Comment!.Trim()).ToList()
                : [],
        };
    }

    /// <summary>Counts distinct items each member answered, from (memberId, itemId) pairs — used to
    /// tell whether a member responded to *every* check-in question / feedback prompt.</summary>
    private static Dictionary<Guid, int> CountAnsweredByMember(IEnumerable<(Guid MemberId, Guid ItemId)> pairs) =>
        pairs.GroupBy(x => x.MemberId).ToDictionary(g => g.Key, g => g.Select(x => x.ItemId).Distinct().Count());

    // memberId is null for a guest viewer: a guest is never a facilitator and has no member-keyed
    // "mine" content (own notes, my votes/ratings), so those all fall out as empty/false/0.
    // memberId/guestSessionId identify the viewer: a member (memberId set) or a guest (guestSessionId
    // set), never both. A guest is never a facilitator; "mine" content is matched on whichever id the
    // viewer carries.
    private RetroBoardSessionDto ToDto(RetroBoardSession s, Guid? memberId, string? guestSessionId = null)
    {
        var isFacil = memberId is Guid viewerId && IsFacilitator(s, viewerId);
        var phaseCfg = ParsePhaseConfig(s.PhaseConfigJson);
        var hideOthers = s.HideNotesUntilReveal && !s.NotesRevealed && s.Phase == Phase.Capture;
        var colKeyById = s.Columns.ToDictionary(c => c.Id, c => c.Key);

        bool VotedByViewer(RetroBoardVote v) =>
            (memberId is Guid vmid && v.MemberId == vmid) || (guestSessionId != null && v.GuestSessionId == guestSessionId);
        var myVotesUsed = s.Notes.SelectMany(n => n.Votes).Count(VotedByViewer);

        // Precompute per-participant participation once (O(1) lookups below) rather than scanning the
        // whole graph per participant. Members and guests are keyed separately. "capture"/"vote" = did
        // at least one; "checkin"/"reflect" = answered all items.
        var capturedByMember = s.Notes.Where(n => n.AuthorMemberId.HasValue).Select(n => n.AuthorMemberId!.Value).ToHashSet();
        var capturedByGuest = s.Notes.Where(n => n.AuthorGuestSessionId != null).Select(n => n.AuthorGuestSessionId!).ToHashSet();
        var votedByMember = s.Notes.SelectMany(n => n.Votes).Where(v => v.MemberId.HasValue).Select(v => v.MemberId!.Value).ToHashSet();
        var votedByGuest = s.Notes.SelectMany(n => n.Votes).Where(v => v.GuestSessionId != null).Select(v => v.GuestSessionId!).ToHashSet();
        // Guest display names by session id, for attributing guest-authored notes.
        var guestNames = s.Participants.Where(p => p.GuestSessionId != null)
            .ToDictionary(p => p.GuestSessionId!, p => p.DisplayName ?? "");
        var checkinAnswers = CountAnsweredByMember(s.CheckinQuestions.SelectMany(q => q.Responses).Select(r => (r.MemberId, r.RetroBoardCheckinQuestionId)));
        var feedbackAnswers = CountAnsweredByMember(s.FeedbackPrompts.SelectMany(fp => fp.Responses).Where(r => r.Score is >= 1 and <= 5).Select(r => (r.MemberId, r.RetroBoardFeedbackPromptId)));
        var qCount = s.CheckinQuestions.Count;
        var fpCount = s.FeedbackPrompts.Count;

        return new RetroBoardSessionDto
        {
            Id = s.Id,
            Slug = s.Slug,
            Title = s.Title,
            SquadId = s.SquadId,
            SquadName = s.Squad?.Name,
            SprintId = s.SprintId,
            SprintName = s.Sprint?.Name,
            CreatedByMemberId = s.CreatedByMemberId,
            IsFacilitator = isFacil,
            Phase = s.Phase,
            Status = s.Status,
            VotesPerUser = s.VotesPerUser,
            MyVotesUsed = myVotesUsed,
            AllowAnonymous = s.AllowAnonymous,
            AllowGuestJoin = s.AllowGuestJoin,
            HideNotesUntilReveal = s.HideNotesUntilReveal,
            NotesRevealed = s.NotesRevealed,
            IsArchived = s.IsArchived,
            StepDurations = string.IsNullOrEmpty(s.StepDurationsJson)
                ? new RetroStepDurations()
                : JsonSerializer.Deserialize<RetroStepDurations>(s.StepDurationsJson, JsonRead) ?? new RetroStepDurations(),
            // Per-phase flags for every live phase (stored value or defaults), + the effective ordered run.
            PhaseConfig = Phase.Order.Where(p => p != Phase.Setup && p != Phase.Summary).ToDictionary(p => p, p => FlagsFor(phaseCfg, p)),
            EnabledPhases = EnabledPhases(phaseCfg, s.CheckinQuestions.Count > 0, s.FeedbackPrompts.Count > 0),
            LiveStateJson = s.LiveStateJson,
            AiSummary = string.IsNullOrEmpty(s.AiSummaryJson) ? null : JsonSerializer.Deserialize<RetroBoardAiSummaryDto>(s.AiSummaryJson, JsonRead),
            CreatedAt = s.CreatedAt,
            StartedAt = s.StartedAt,
            ClosedAt = s.ClosedAt,
            ArchivedAt = s.ArchivedAt,
            Columns = s.Columns.OrderBy(c => c.SortOrder).Select(c => new RetroBoardColumnDto
            {
                Id = c.Id, Key = c.Key, Label = c.Label, Description = c.Description, Color = c.Color, Icon = c.Icon, SortOrder = c.SortOrder,
            }).ToList(),
            Notes = s.Notes.OrderBy(n => n.CreatedAt).Select(n =>
            {
                var isOwn = (memberId is Guid vm && n.AuthorMemberId == vm)
                    || (guestSessionId != null && n.AuthorGuestSessionId == guestSessionId);
                var hidden = IsNoteHidden(n, isOwn, isFacil, hideOthers);
                var guestAuthorName = n.AuthorGuestSessionId != null ? guestNames.GetValueOrDefault(n.AuthorGuestSessionId) : null;
                return new RetroBoardNoteDto
                {
                    Id = n.Id,
                    ColumnId = n.RetroBoardColumnId,
                    ColumnKey = colKeyById.GetValueOrDefault(n.RetroBoardColumnId, ""),
                    Text = hidden ? null : n.Text,
                    AuthorId = (n.IsAnonymous || hidden) ? null : n.AuthorMemberId,
                    AuthorName = (n.IsAnonymous || hidden) ? null
                        : (n.Author is not null ? $"{n.Author.FirstName} {n.Author.LastName}".Trim() : guestAuthorName),
                    AuthorAvatarSeed = (n.IsAnonymous || hidden) ? null : n.Author?.AvatarSeed,
                    IsAnonymous = n.IsAnonymous,
                    IsOwn = isOwn,
                    Flagged = n.Flagged,
                    Clarification = hidden ? null : n.Clarification,
                    IntroducedAt = n.IntroducedAt,
                    CreatedAt = n.CreatedAt,
                    VoteCount = n.Votes.Count,
                    MyVoteCount = n.Votes.Count(VotedByViewer),
                };
            }).ToList(),
            CheckinQuestions = s.CheckinQuestions.OrderBy(q => q.SortOrder).Select(q => new RetroBoardCheckinQuestionDto
            {
                Id = q.Id, Text = q.Text, ContextText = q.ContextText, SourceActionId = q.SourceActionId, SortOrder = q.SortOrder,
                MyRating = q.Responses.FirstOrDefault(r => r.MemberId == memberId)?.Rating,
                Better = q.Responses.Count(r => r.Rating == Rating.Better),
                Same = q.Responses.Count(r => r.Rating == Rating.Same),
                Worse = q.Responses.Count(r => r.Rating == Rating.Worse),
                Na = q.Responses.Count(r => r.Rating == Rating.Na),
            }).ToList(),
            Participants = s.Participants.OrderBy(p => p.JoinedAt).Select(p => new RetroBoardParticipantDto
            {
                Id = p.Id, MemberId = p.MemberId, IsGuest = p.MemberId is null,
                Name = p.Member is not null ? $"{p.Member.FirstName} {p.Member.LastName}".Trim() : (p.DisplayName ?? ""),
                AvatarSeed = p.Member?.AvatarSeed, Role = p.Role,
                // Capture/vote count for members and guests alike; check-in/reflect are member-only
                // engagement, so a guest is never counted for those.
                Responded = new Dictionary<string, bool>
                {
                    [Phase.Checkin] = p.MemberId is Guid cm && qCount > 0 && checkinAnswers.GetValueOrDefault(cm) == qCount,
                    [Phase.Capture] = (p.MemberId is Guid capm && capturedByMember.Contains(capm))
                        || (p.GuestSessionId is string capg && capturedByGuest.Contains(capg)),
                    [Phase.Vote] = (p.MemberId is Guid vpm && votedByMember.Contains(vpm))
                        || (p.GuestSessionId is string vpg && votedByGuest.Contains(vpg)),
                    [Phase.Reflect] = p.MemberId is Guid rm && fpCount > 0 && feedbackAnswers.GetValueOrDefault(rm) == fpCount,
                },
            }).ToList(),
            Actions = s.Actions.OrderBy(a => a.CreatedAt).Select(MapAction).ToList(),
            FeedbackPrompts = s.FeedbackPrompts.OrderBy(p => p.SortOrder)
                .Select(p => MapFeedbackPrompt(p, memberId, isFacil)).ToList(),
        };
    }
}
