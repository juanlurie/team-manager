using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs;
using TeamManager.Api.Application.DTOs.WinOfTheWeek;
using TeamManager.Api.Application.Realtime;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class WinOfTheWeekService(
    AppDbContext db,
    WowVotingService voting,
    WowTokenService tokens,
    WowWeekCloser weekCloser,
    WowTiebreakerService tiebreaker,
    WowQuizService quiz,
    IWowNotifier notifier,
    IWowPresence presence) : IWinOfTheWeekService
{
    private const int MaxNominationsPerPerson = WinOfTheWeekLimits.MaxNominationsPerPerson;
    private const int MaxVotesPerPerson = WinOfTheWeekLimits.MaxVotesPerPerson;

    public async Task<WinWeekDto?> GetCurrentWeekAsync(Guid currentMemberId, Guid seriesId)
    {
        var week = await GetActiveWeekAsync(seriesId);
        if (week is null) return null;

        // Expired sudden-death and hype-battle resolution is NOT done here anymore. This is a GET,
        // polled by every connected client every few seconds; resolving inline meant N callers raced
        // into CloseWeekWithWinnerAsync, double-granting the bonus token and firing two AI stories.
        // WowTiebreakerProgressWorker now owns that resolution on a single serial loop — no race.
        // The quiz auto-loop keeps advancing on GET because it already guards itself with an atomic
        // ExecuteUpdateAsync claim (see TryResolveQuizAsync) and benefits from snappier progression.
        await ClearExpiredQuizAsync(week);

        var nominations = await db.WinNominations
            .Include(n => n.TeamMember)
            .Include(n => n.Nominee)
            .Include(n => n.Votes)
            .Where(n => n.WinWeekId == week.Id)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        var nominationIds = nominations.Select(n => n.Id).ToList();

        var userVoteNominationIds = await db.WinVotes
            .Where(v => v.TeamMemberId == currentMemberId && nominationIds.Contains(v.WinNominationId))
            .Select(v => v.WinNominationId)
            .ToListAsync();

        var userNominationCount = await db.WinNominations
            .CountAsync(n => n.WinWeekId == week.Id && n.TeamMemberId == currentMemberId && n.TeamMemberId != null);

        var userVoteCount = await db.WinVotes
            .CountAsync(v => v.TeamMemberId == currentMemberId && nominationIds.Contains(v.WinNominationId));

        // During sudden death, track votes only on tied nominations (old votes were cleared)
        int userSuddenDeathVoteCount = 0;
        if (week.Status == WinWeekStatus.SuddenDeath && !string.IsNullOrEmpty(week.TiedNominationIds))
        {
            var tiedForCount = JsonSerializer.Deserialize<List<Guid>>(week.TiedNominationIds) ?? [];
            userSuddenDeathVoteCount = await db.WinVotes
                .CountAsync(v => v.TeamMemberId == currentMemberId && v.TeamMemberId != null && tiedForCount.Contains(v.WinNominationId));
        }

        var totalVotesCast = nominations.Sum(n => n.Votes.Count);
        var activeMemberCount = await db.TeamMembers.CountAsync(m => m.IsActive);

        WinNomination? winner = null;
        if (week.WinnerNominationId.HasValue)
        {
            winner = nominations.FirstOrDefault(n => n.Id == week.WinnerNominationId.Value);
        }

        var quizAnswers = await db.WinQuizAnswers.Where(a => a.WinWeekId == week.Id).ToListAsync();
        var quizAnsweredMemberIds = quizAnswers.Select(a => a.MemberId).ToList();
        var quizMyAnswer = quizAnswers.FirstOrDefault(a => a.MemberId == currentMemberId);
        var quizEligible = week.Status != WinWeekStatus.Closed && string.IsNullOrEmpty(week.QuizQuestion)
            && await IsQuizEligibleAsync(week.Id);
        var quizWinnerNomination = week.QuizWinnerMemberId.HasValue
            ? nominations.FirstOrDefault(n => n.NomineeMemberId == week.QuizWinnerMemberId.Value)
            : null;

        return new WinWeekDto
        {
            Id = week.Id,
            SeriesId = week.WinSeriesId,
            SeriesName = week.Series?.Name ?? string.Empty,
            WeekStart = week.WeekStart,
            Status = week.Status.ToString(),
            WinnerNominationId = week.WinnerNominationId,
            WinnerTitle = winner?.Title,
            WinnerNomineeName = winner != null ? $"{winner.Nominee.FirstName} {winner.Nominee.LastName}" : null,
            OpenedAt = week.OpenedAt,
            ClosedAt = week.ClosedAt,
            SuddenDeathEndsAt = week.SuddenDeathEndsAt,
            HypeBattleEndsAt = week.HypeBattleEndsAt,
            QuizEndsAt = week.QuizEndsAt,
            QuizQuestion = week.QuizQuestion,
            QuizOptions = week.QuizOptionsJson != null ? JsonSerializer.Deserialize<List<string>>(week.QuizOptionsJson) ?? [] : [],
            QuizAnsweredMemberIds = quizAnsweredMemberIds,
            QuizEligible = quizEligible,
            QuizRevealed = week.QuizRevealed,
            QuizRevealEndsAt = week.QuizRevealed && !week.QuizWinnerMemberId.HasValue
                ? week.QuizRevealedAt?.AddSeconds(WowQuizService.QuizRevealDisplaySeconds) : null,
            QuizCorrectIndex = week.QuizRevealed ? week.QuizCorrectIndex : null,
            QuizIsAiGenerated = week.QuizIsAiGenerated,
            QuizMyAnswerIndex = quizMyAnswer?.SelectedIndex,
            QuizWinnerMemberId = week.QuizWinnerMemberId,
            QuizWinnerName = quizWinnerNomination != null ? $"{quizWinnerNomination.Nominee.FirstName} {quizWinnerNomination.Nominee.LastName}" : null,
            QuizEliminatedMemberIds = WowQuizService.ParseGuidListOrEmpty(week.QuizEliminatedMemberIds),
            CurrentMemberId = currentMemberId,
            UserVotesRemaining = week.Status == WinWeekStatus.SuddenDeath ? Math.Max(0, 1 - userSuddenDeathVoteCount) : MaxVotesPerPerson - userVoteCount,
            UserNominationsRemaining = MaxNominationsPerPerson - userNominationCount,
            TotalVotesCast = totalVotesCast,
            ActiveMemberCount = activeMemberCount,
            ConnectedMemberCount = week.GuestToken != null ? presence.GetSessionCount(week.GuestToken) : 0,
            TiedNominationIds = week.TiedNominationIds != null
                ? JsonSerializer.Deserialize<List<Guid>>(week.TiedNominationIds) ?? []
                : [],
            PowerUpsEnabled = week.Series?.PowerUpsEnabled ?? true,
            HideVoteCounts = week.Series?.HideVoteCounts ?? false,
            GuestToken = week.GuestToken,
            WinnerStory = week.WinnerStory,
            Nominations = nominations.Select(n => new WinNominationDto
            {
                Id = n.Id,
                WinWeekId = n.WinWeekId,
                TeamMemberId = n.TeamMemberId,
                TeamMemberName = n.TeamMember != null
                    ? $"{n.TeamMember.FirstName} {n.TeamMember.LastName}"
                    : (n.GuestName ?? "Guest"),
                IsGuestNomination = n.TeamMemberId == null,
                NomineeMemberId = n.NomineeMemberId,
                NomineeName = $"{n.Nominee.FirstName} {n.Nominee.LastName}",
                Title = n.Title,
                Description = n.Description,
                CreatedAt = n.CreatedAt,
                VoteCount = n.Votes.Count,
                HasVoted = userVoteNominationIds.Contains(n.Id),
                PowerUp = n.PowerUp,
                ChaosCard = n.ChaosCard,
                HypeMeterCount = n.HypeMeterCount
            }).ToList()
        };
    }

    public async Task<WinNominationDto> CreateNominationAsync(Guid memberId, CreateNominationRequest request, Guid seriesId = default)
    {
        var week = seriesId != default
            ? await GetActiveWeekAsync(seriesId)
            : await db.WinWeeks.Include(w => w.Series).Where(w => w.Status == WinWeekStatus.Nominating || w.Status == WinWeekStatus.Voting).OrderByDescending(w => w.WeekStart).FirstOrDefaultAsync();
        if (week is null) throw new InvalidOperationException("No active week found.");

        if (week.Status != WinWeekStatus.Nominating && week.Status != WinWeekStatus.Voting)
            throw new InvalidOperationException("Nominations are not open for the current week.");

        var count = await db.WinNominations
            .CountAsync(n => n.WinWeekId == week.Id && n.TeamMemberId == memberId && n.TeamMemberId != null);

        if (count >= MaxNominationsPerPerson)
            throw new InvalidOperationException($"You can only submit up to {MaxNominationsPerPerson} nominations per week.");

        var nomination = new WinNomination
        {
            WinWeekId = week.Id,
            TeamMemberId = memberId,
            NomineeMemberId = request.NomineeMemberId,
            Title = request.Title,
            Description = request.Description
        };

        db.WinNominations.Add(nomination);
        await db.SaveChangesAsync();

        await db.Entry(nomination).Reference(n => n.TeamMember).LoadAsync();
        await db.Entry(nomination).Reference(n => n.Nominee).LoadAsync();

        var dto = MapNominationDto(nomination, false);
        notifier.Broadcast("nomination_created", new { nomination = dto }, guestAllowed: true);
        return dto;
    }

    public async Task<WinNominationDto> UpdateNominationAsync(Guid memberId, Guid nominationId, CreateNominationRequest request)
    {
        var nomination = await db.WinNominations
            .Include(n => n.TeamMember)
            .Include(n => n.Nominee)
            .Include(n => n.WinWeek)
            .FirstOrDefaultAsync(n => n.Id == nominationId);

        if (nomination is null)
            throw new KeyNotFoundException("Nomination not found.");

        if (nomination.TeamMemberId != memberId)
            throw new InvalidOperationException("You can only edit your own nominations.");

        if (nomination.WinWeek.Status != WinWeekStatus.Nominating)
            throw new InvalidOperationException("Nominations can only be edited before voting opens.");

        nomination.Title = request.Title;
        nomination.Description = request.Description;
        nomination.NomineeMemberId = request.NomineeMemberId;

        await db.SaveChangesAsync();

        // KNOWN BUG (pre-existing, left as-is): NomineeMemberId changed above, but the Nominee
        // navigation was fixed up at query time and the new nominee isn't tracked, so NomineeName
        // below is the PREVIOUS nominee's. Fixing it changes what the UI shows, so it wants a test
        // first — see the plan's Phase 4. VoteCount is 0 for the same shape of reason: Votes was
        // never Include()d. Harmless only because edits are confined to the Nominating phase.
        var dto = MapNominationDto(nomination, false);
        notifier.Broadcast("nomination_updated", new { nomination = dto }, guestAllowed: true);
        return dto;
    }

    public async Task<bool> DeleteNominationAsync(Guid memberId, Guid nominationId)
    {
        var nomination = await db.WinNominations
            .Include(n => n.WinWeek)
            .FirstOrDefaultAsync(n => n.Id == nominationId);

        if (nomination is null)
            throw new KeyNotFoundException("Nomination not found.");

        if (nomination.TeamMemberId == null || nomination.TeamMemberId != memberId)
            throw new InvalidOperationException("You can only delete your own nominations.");

        if (nomination.WinWeek.Status != WinWeekStatus.Nominating)
            throw new InvalidOperationException("Nominations can only be deleted before voting opens.");

        db.WinNominations.Remove(nomination);
        await db.SaveChangesAsync();

        notifier.Broadcast("nomination_deleted", new { nominationId }, guestAllowed: true);
        return true;
    }

    public Task<WinVoteDto> VoteAsync(Guid memberId, Guid nominationId) =>
        voting.CastVoteAsync(nominationId, WowVoter.Member(memberId));

    public Task<bool> RemoveVoteAsync(Guid memberId, Guid nominationId) =>
        voting.RemoveVoteAsync(nominationId, WowVoter.Member(memberId));

    public async Task<WinWeekDto> CloseWeekAsync(Guid memberId, Guid seriesId, CloseWeekRequest request)
    {
        var week = await db.WinWeeks
            .Include(w => w.Nominations)
            .Where(w => w.WinSeriesId == seriesId && (w.Status == WinWeekStatus.Voting || w.Status == WinWeekStatus.SuddenDeath))
            .OrderByDescending(w => w.WeekStart)
            .FirstOrDefaultAsync();

        if (week is null)
            throw new InvalidOperationException("No active voting week found to close.");

        var nomination = week.Nominations.FirstOrDefault(n => n.Id == request.WinnerNominationId);
        if (nomination is null)
            throw new KeyNotFoundException("The specified nomination does not belong to the current week.");

        // Delegate rather than re-implement. This path used to set Status/Winner/ClosedAt itself and
        // leave TiedNominationIds, SuddenDeathEndsAt, HypeBattleEndsAt and the quiz columns dirty —
        // CloseWeekWithWinnerAsync clears them all, awards the achievement, grants the bonus token,
        // kicks off the win story and broadcasts voting_closed.
        await weekCloser.CloseWithWinnerAsync(week, request.WinnerNominationId);

        return (await GetCurrentWeekAsync(memberId, seriesId))!;
    }

    public async Task<WinWeekDto> OpenNextWeekAsync(Guid memberId, Guid seriesId)
    {
        var latestWeek = await db.WinWeeks
            .Where(w => w.WinSeriesId == seriesId)
            .OrderByDescending(w => w.WeekStart)
            .FirstOrDefaultAsync();

        DateOnly weekStart;
        if (latestWeek is not null)
        {
            if (latestWeek.Status != WinWeekStatus.Closed)
                throw new InvalidOperationException("Cannot open a new week while the current week is still active. Close it first.");

            weekStart = latestWeek.WeekStart.AddDays(7);
        }
        else
        {
            var today = DateOnly.FromDateTime(DateTimeOffset.UtcNow.Date);
            weekStart = GetWeekStart(today);
        }

        var existing = await db.WinWeeks
            .FirstOrDefaultAsync(w => w.WinSeriesId == seriesId && w.WeekStart == weekStart);

        if (existing is not null)
            throw new InvalidOperationException("A week already exists for this period.");

        // Carry the guest token forward so existing share links keep working
        var carryToken = latestWeek?.GuestToken;
        if (carryToken != null) latestWeek!.GuestToken = null;

        var week = new WinWeek
        {
            WeekStart = weekStart,
            WeekEnd = weekStart.AddDays(6),
            Status = WinWeekStatus.Nominating,
            CreatedByMemberId = memberId,
            WinSeriesId = seriesId,
            GuestToken = carryToken
        };

        db.WinWeeks.Add(week);
        await db.SaveChangesAsync();

        await tokens.GrantWeeklyTokensAsync(week.Id);

        return (await GetCurrentWeekAsync(memberId, seriesId))!;
    }

    public async Task<WinWeekDto> OpenVotingAsync(Guid memberId, Guid seriesId)
    {
        var week = await db.WinWeeks
            .Include(w => w.Nominations)
            .Where(w => w.WinSeriesId == seriesId && w.Status == WinWeekStatus.Nominating)
            .OrderByDescending(w => w.WeekStart)
            .FirstOrDefaultAsync();

        if (week is null)
            throw new InvalidOperationException("No nominating week found for this series.");

        if (week.Status != WinWeekStatus.Nominating)
            throw new InvalidOperationException("Voting can only be opened during the nominating phase.");

        if (week.Nominations.Count == 0)
            throw new InvalidOperationException("Cannot open voting with no nominations.");

        week.Status = WinWeekStatus.Voting;
        await db.SaveChangesAsync();

        notifier.Broadcast("voting_opened", new { }, guestAllowed: true);
        return (await GetCurrentWeekAsync(memberId, seriesId))!;
    }

    public async Task<WinWeekDto> ReopenNominationsAsync(Guid memberId, Guid seriesId)
    {
        var week = await db.WinWeeks
            .Where(w => w.WinSeriesId == seriesId && (w.Status == WinWeekStatus.Voting || w.Status == WinWeekStatus.SuddenDeath))
            .OrderByDescending(w => w.WeekStart)
            .FirstOrDefaultAsync();

        if (week is null)
            throw new InvalidOperationException("No active week found.");

        if (week.Status != WinWeekStatus.Voting && week.Status != WinWeekStatus.SuddenDeath)
            throw new InvalidOperationException("Nominations can only be reopened from the Voting or Tie-Breaker phase.");

        week.Status = WinWeekStatus.Nominating;
        week.TiedNominationIds = null;
        week.SuddenDeathEndsAt = null;

        var nominationIds = await db.WinNominations
            .Where(n => n.WinWeekId == week.Id)
            .Select(n => n.Id)
            .ToListAsync();
        var votes = await db.WinVotes
            .Where(v => nominationIds.Contains(v.WinNominationId))
            .ToListAsync();
        db.WinVotes.RemoveRange(votes);

        await db.SaveChangesAsync();

        notifier.Broadcast("nominations_reopened", new { }, guestAllowed: true);
        return (await GetCurrentWeekAsync(memberId, seriesId))!;
    }

    public async Task<WinWeekDto> StartSuddenDeathAsync(Guid memberId, Guid seriesId, StartSuddenDeathRequest request)
    {
        await tiebreaker.StartSuddenDeathAsync(seriesId, request);
        return (await GetCurrentWeekAsync(memberId, seriesId))!;
    }

    // A presentation-only countdown the host shows on screen; not persisted, just announced. Scoped
    // to the week's guest token when there is one so a shared screen and the guest link stay in sync.
    public async Task<DateTimeOffset> StartTimerAsync(Guid seriesId, int durationSeconds)
    {
        var token = await GetActiveNonClosedWeekGuestTokenAsync(seriesId);
        var endsAt = DateTimeOffset.UtcNow.AddSeconds(durationSeconds);
        if (token is not null)
            notifier.BroadcastToSession("wow_timer_started", token, new { endsAt });
        else
            notifier.Broadcast("wow_timer_started", new { endsAt }, guestAllowed: true);
        return endsAt;
    }

    public async Task StopTimerAsync(Guid seriesId)
    {
        var token = await GetActiveNonClosedWeekGuestTokenAsync(seriesId);
        if (token is not null)
            notifier.BroadcastToSession("wow_timer_stopped", token, new { });
        else
            notifier.Broadcast("wow_timer_stopped", new { }, guestAllowed: true);
    }

    public Task<DateTimeOffset> StartHypeBattleAsync(Guid seriesId, int durationSeconds) =>
        tiebreaker.StartHypeBattleAsync(seriesId, durationSeconds);

    public Task EndHypeBattleAsync(Guid seriesId) => tiebreaker.EndHypeBattleAsync(seriesId);

    private async Task<string?> GetActiveNonClosedWeekGuestTokenAsync(Guid seriesId) =>
        await db.WinWeeks
            .Where(w => w.WinSeriesId == seriesId && w.Status != WinWeekStatus.Closed)
            .OrderByDescending(w => w.WeekStart)
            .Select(w => w.GuestToken)
            .FirstOrDefaultAsync();

    public async Task<IReadOnlyList<WinWeekHistoryDto>> GetHistoryAsync(Guid seriesId, int? year = null, int limit = 52)
    {
        var query = db.WinWeeks
            .Where(w => w.WinSeriesId == seriesId && w.Status == WinWeekStatus.Closed && w.WinnerNominationId.HasValue)
            .AsQueryable();

        if (year.HasValue)
            query = query.Where(w => w.WeekStart.Year == year.Value);

        var weeks = await query
            .OrderByDescending(w => w.WeekStart)
            .Take(limit)
            .ToListAsync();

        var winnerIds = weeks.Where(w => w.WinnerNominationId.HasValue).Select(w => w.WinnerNominationId!.Value).ToList();
        if (winnerIds.Count == 0) return [];

        // Project the vote count as a SQL COUNT rather than Include(Votes) + .Count in memory — this
        // runs across up to `limit` (52) winners, so materialising every vote row was pure waste.
        var winners = await db.WinNominations
            .Where(n => winnerIds.Contains(n.Id))
            .Select(n => new
            {
                n.Id,
                NomineeName = n.Nominee.FirstName + " " + n.Nominee.LastName,
                n.Title,
                n.Description,
                VoteCount = n.Votes.Count
            })
            .ToListAsync();

        var winnerLookup = winners.ToDictionary(w => w.Id);

        return weeks.Select(week =>
        {
            var winner = week.WinnerNominationId.HasValue && winnerLookup.TryGetValue(week.WinnerNominationId.Value, out var w) ? w : null;
            return new WinWeekHistoryDto
            {
                Id = week.Id,
                WeekStart = week.WeekStart,
                WeekEnd = week.WeekEnd,
                WinnerNomineeName = winner?.NomineeName,
                WinnerTitle = winner?.Title,
                WinnerDescription = winner?.Description,
                WinnerVoteCount = winner?.VoteCount ?? 0,
                ClosedAt = week.ClosedAt ?? DateTimeOffset.UtcNow
            };
        }).ToList();
    }

    public async Task<WinWeekDetailDto> GetWeekDetailAsync(Guid weekId, Guid memberId)
    {
        var week = await db.WinWeeks
            .FirstOrDefaultAsync(w => w.Id == weekId);

        if (week is null)
            throw new KeyNotFoundException("Week not found.");

        var nominations = await db.WinNominations
            .Include(n => n.TeamMember)
            .Include(n => n.Nominee)
            .Include(n => n.Votes)
            .Where(n => n.WinWeekId == weekId)
            .OrderByDescending(n => n.Votes.Count)
            .ToListAsync();

        var userVoteIds = await db.WinVotes
            .Where(v => v.TeamMemberId == memberId && nominations.Select(n => n.Id).Contains(v.WinNominationId))
            .Select(v => v.WinNominationId)
            .ToListAsync();

        var winner = nominations.FirstOrDefault(n => n.Id == week.WinnerNominationId);

        return new WinWeekDetailDto
        {
            Id = week.Id,
            WeekStart = week.WeekStart,
            WeekEnd = week.WeekEnd,
            WinnerNomineeName = winner != null ? $"{winner.Nominee.FirstName} {winner.Nominee.LastName}" : null,
            WinnerTitle = winner?.Title,
            AllNominations = nominations.Select(n => new WinNominationDto
            {
                Id = n.Id,
                WinWeekId = n.WinWeekId,
                TeamMemberId = n.TeamMemberId,
                TeamMemberName = n.TeamMember != null
                    ? $"{n.TeamMember.FirstName} {n.TeamMember.LastName}"
                    : (n.GuestName ?? "Guest"),
                IsGuestNomination = n.TeamMemberId == null,
                NomineeMemberId = n.NomineeMemberId,
                NomineeName = $"{n.Nominee.FirstName} {n.Nominee.LastName}",
                Title = n.Title,
                Description = n.Description,
                CreatedAt = n.CreatedAt,
                VoteCount = n.Votes.Count,
                HasVoted = userVoteIds.Contains(n.Id),
                PowerUp = n.PowerUp,
                ChaosCard = n.ChaosCard,
                HypeMeterCount = n.HypeMeterCount
            }).ToList()
        };
    }

    private async Task<WinWeek?> GetActiveWeekAsync(Guid seriesId)
    {
        return await db.WinWeeks
            .Include(w => w.Series)
            .Where(w => w.WinSeriesId == seriesId)
            .OrderByDescending(w => w.WeekStart)
            .FirstOrDefaultAsync();
    }

    // The most-recent *non-closed* week for a series (what the quiz/tiebreaker commands act on).
    // Distinct from GetActiveWeekAsync, which returns the latest week even when it's closed so the
    // read model can still show the winner.
    public async Task<Guid?> GetActiveWeekIdAsync(Guid seriesId) =>
        await db.WinWeeks
            .Where(w => w.WinSeriesId == seriesId && w.Status != WinWeekStatus.Closed)
            .OrderByDescending(w => w.WeekStart)
            .Select(w => (Guid?)w.Id)
            .FirstOrDefaultAsync();

    private static DateOnly GetWeekStart(DateOnly date)
    {
        var diff = (7 + (int)date.DayOfWeek - (int)DayOfWeek.Monday) % 7;
        return date.AddDays(-diff);
    }

    public async Task<int> GetTokenBalanceAsync(Guid memberId, Guid seriesId)
    {
        var week = await GetActiveWeekAsync(seriesId);
        if (week is null) return 0;
        return await tokens.GetBalanceAsync(memberId, week.Id);
    }

    public Task<WinNominationDto> ApplyPowerUpAsync(Guid memberId, Guid nominationId, string type) =>
        ApplyCardAsync(memberId, nominationId, WowCardKind.PowerUp, type);

    public Task<WinNominationDto> ApplyChaosCardAsync(Guid memberId, Guid nominationId, string type) =>
        ApplyCardAsync(memberId, nominationId, WowCardKind.ChaosCard, type);

    // Power-up and chaos card are the same operation for a member: validate, spend the weekly token,
    // set the field. They differed only by the valid-type set, the field and the message noun.
    private async Task<WinNominationDto> ApplyCardAsync(Guid memberId, Guid nominationId, WowCardKind kind, string type)
    {
        if (!WowCards.TypesFor(kind).Contains(type))
            throw new InvalidOperationException($"Invalid {WowCards.Noun(kind)} type: {type}");

        var nomination = await db.WinNominations
            .Include(n => n.TeamMember)
            .Include(n => n.Nominee)
            .Include(n => n.Votes)
            .Include(n => n.WinWeek)
            .FirstOrDefaultAsync(n => n.Id == nominationId);

        if (nomination is null)
            throw new KeyNotFoundException("Nomination not found.");

        if (nomination.WinWeek.Status != WinWeekStatus.Voting && nomination.WinWeek.Status != WinWeekStatus.SuddenDeath)
            throw new InvalidOperationException($"{WowCards.Plural(kind)} can only be applied during voting.");

        if (WowCards.IsApplied(nomination, kind))
            throw new InvalidOperationException($"A {WowCards.Noun(kind)} has already been applied to this nomination.");

        await tokens.SpendTokenAsync(memberId, nomination.WinWeekId, nominationId);

        WowCards.Set(nomination, kind, type);
        await db.SaveChangesAsync();

        var dto = MapNominationDto(nomination, false);
        notifier.Broadcast("nomination_updated", new { nomination = dto }, guestAllowed: true);
        return dto;
    }

    public Task<int> IncrementHypeMeterAsync(Guid nominationId) => tiebreaker.IncrementHypeMeterAsync(nominationId);

    private WinNominationDto MapNominationDto(WinNomination n, bool hasVoted) => new()
    {
        Id = n.Id,
        WinWeekId = n.WinWeekId,
        TeamMemberId = n.TeamMemberId,
        TeamMemberName = n.TeamMember != null
            ? $"{n.TeamMember.FirstName} {n.TeamMember.LastName}"
            : (n.GuestName ?? "Guest"),
        IsGuestNomination = n.TeamMemberId == null,
        NomineeMemberId = n.NomineeMemberId,
        NomineeName = $"{n.Nominee.FirstName} {n.Nominee.LastName}",
        Title = n.Title,
        Description = n.Description,
        CreatedAt = n.CreatedAt,
        VoteCount = n.Votes.Count,
        HasVoted = hasVoted,
        PowerUp = n.PowerUp,
        ChaosCard = n.ChaosCard,
        HypeMeterCount = n.HypeMeterCount
    };

    public Task AutoCloseExpiredSuddenDeathAsync(Guid weekId) => tiebreaker.AutoCloseExpiredSuddenDeathAsync(weekId);

    public Task AutoResolveExpiredHypeBattleAsync(Guid weekId) => tiebreaker.AutoResolveExpiredHypeBattleAsync(weekId);

    // ─── Quiz Duel (WowQuizService) ───
    // Thin facades over the extracted quiz service. The command methods return the series id so this
    // service can build the read model without the quiz service reaching back onto the read path.

    public Task ClearExpiredQuizAsync(WinWeek week) => quiz.ClearExpiredQuizAsync(week);

    public Task<bool> IsQuizEligibleAsync(Guid weekId) => quiz.IsQuizEligibleAsync(weekId);

    public async Task<WinWeekDto> StartQuizAsync(Guid memberId, Guid weekId, int? difficultyLevel = null)
    {
        var seriesId = await quiz.StartQuizAsync(weekId, difficultyLevel);
        return await GetCurrentWeekAsync(memberId, seriesId)
            ?? throw new InvalidOperationException("Week not found after starting quiz.");
    }

    public Task<bool> SubmitQuizAnswerAsync(Guid memberId, Guid weekId, int selectedIndex) =>
        quiz.SubmitQuizAnswerAsync(memberId, weekId, selectedIndex);

    public async Task<WinWeekDto> CompleteQuizWinnerAsync(Guid memberId, Guid weekId)
    {
        var seriesId = await quiz.CompleteQuizWinnerAsync(weekId);
        return await GetCurrentWeekAsync(memberId, seriesId)
            ?? throw new InvalidOperationException("Week not found after closing.");
    }

    public async Task<WinWeekDto> StopQuizAsync(Guid memberId, Guid weekId)
    {
        var seriesId = await quiz.StopQuizAsync(weekId);
        return await GetCurrentWeekAsync(memberId, seriesId)
            ?? throw new InvalidOperationException("Week not found after stopping quiz.");
    }
}
