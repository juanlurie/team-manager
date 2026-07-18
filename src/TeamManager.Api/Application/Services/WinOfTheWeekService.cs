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
    QuizQuestionGeneratorService questionGenerator,
    IWinStoryGenerator winStory,
    WowVotingService voting,
    WowTokenService tokens,
    IWowNotifier notifier,
    IWowPresence presence) : IWinOfTheWeekService
{
    private const int MaxNominationsPerPerson = WinOfTheWeekLimits.MaxNominationsPerPerson;
    private const int MaxVotesPerPerson = WinOfTheWeekLimits.MaxVotesPerPerson;
    internal const int QuizRevealDisplaySeconds = 5;

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
                ? week.QuizRevealedAt?.AddSeconds(QuizRevealDisplaySeconds) : null,
            QuizCorrectIndex = week.QuizRevealed ? week.QuizCorrectIndex : null,
            QuizIsAiGenerated = week.QuizIsAiGenerated,
            QuizMyAnswerIndex = quizMyAnswer?.SelectedIndex,
            QuizWinnerMemberId = week.QuizWinnerMemberId,
            QuizWinnerName = quizWinnerNomination != null ? $"{quizWinnerNomination.Nominee.FirstName} {quizWinnerNomination.Nominee.LastName}" : null,
            QuizEliminatedMemberIds = ParseGuidListOrEmpty(week.QuizEliminatedMemberIds),
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
        await CloseWeekWithWinnerAsync(week, request.WinnerNominationId);

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
        var week = await db.WinWeeks
            .Include(w => w.Nominations)
            .Where(w => w.WinSeriesId == seriesId && w.Status == WinWeekStatus.Voting)
            .OrderByDescending(w => w.WeekStart)
            .FirstOrDefaultAsync();

        if (week is null)
            throw new InvalidOperationException("No week found for the current period.");

        if (week.Status != WinWeekStatus.Voting)
            throw new InvalidOperationException("Sudden death can only be started during voting phase.");

        if (week.QuizQuestion is not null)
            throw new InvalidOperationException("Stop Quiz Duel before starting Sudden Death.");

        if (request.TiedNominationIds.Count < 2)
            throw new InvalidOperationException("Sudden death requires at least 2 tied nominations.");

        var tiedIds = request.TiedNominationIds.ToHashSet();
        var validNominations = week.Nominations.Where(n => tiedIds.Contains(n.Id)).ToList();
        if (validNominations.Count != request.TiedNominationIds.Count)
            throw new InvalidOperationException("One or more tied nominations do not belong to the current week.");

        // Clear all votes on tied nominations so sudden death starts fresh
        var votesToClear = db.WinVotes.Where(v => tiedIds.Contains(v.WinNominationId));
        db.WinVotes.RemoveRange(votesToClear);

        week.Status = WinWeekStatus.SuddenDeath;
        week.TiedNominationIds = JsonSerializer.Serialize(request.TiedNominationIds);
        week.SuddenDeathEndsAt = DateTimeOffset.UtcNow.AddSeconds(request.DurationSeconds ?? 90);
        await db.SaveChangesAsync();

        notifier.Broadcast("sudden_death_started", new
        {
            weekId = week.Id,
            endsAt = week.SuddenDeathEndsAt,
            tiedNominationIds = request.TiedNominationIds
        }, guestAllowed: true);

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

    public async Task<DateTimeOffset> StartHypeBattleAsync(Guid seriesId, int durationSeconds)
    {
        var week = await GetActiveNonClosedWeekAsync(seriesId);

        if (week?.QuizQuestion is not null)
            throw new InvalidOperationException("Stop Quiz Duel before starting Hype Battle.");

        var endsAt = DateTimeOffset.UtcNow.AddSeconds(durationSeconds);
        if (week is not null)
        {
            week.HypeBattleEndsAt = endsAt;
            // Always start fresh -- clear any taps left over from a previous battle this week.
            await db.WinNominations
                .Where(n => n.WinWeekId == week.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(n => n.HypeMeterCount, 0));
            await db.SaveChangesAsync();
        }

        if (week?.GuestToken is { } token)
            notifier.BroadcastToSession("wow_hype_battle_started", token, new { endsAt });
        else
            notifier.Broadcast("wow_hype_battle_started", new { endsAt }, guestAllowed: true);
        return endsAt;
    }

    public async Task EndHypeBattleAsync(Guid seriesId)
    {
        var week = await GetActiveNonClosedWeekAsync(seriesId);

        // Manual stop just ends the mini-game -- no auto-resolve, unlike letting the timer run out.
        if (week is not null)
        {
            week.HypeBattleEndsAt = null;
            await db.SaveChangesAsync();
        }

        if (week?.GuestToken is { } token)
            notifier.BroadcastToSession("wow_hype_battle_ended", token, new { });
        else
            notifier.Broadcast("wow_hype_battle_ended", new { }, guestAllowed: true);
    }

    // The most-recent non-closed week for a series, or null. Mirrors the query the controller used
    // for timer/hype-battle before this logic moved into the service.
    private async Task<WinWeek?> GetActiveNonClosedWeekAsync(Guid seriesId) =>
        await db.WinWeeks
            .Where(w => w.WinSeriesId == seriesId && w.Status != WinWeekStatus.Closed)
            .OrderByDescending(w => w.WeekStart)
            .FirstOrDefaultAsync();

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

    public async Task<int> IncrementHypeMeterAsync(Guid nominationId)
    {
        var nomination = await db.WinNominations
            .Include(n => n.WinWeek)
            .FirstOrDefaultAsync(n => n.Id == nominationId);

        if (nomination is null)
            throw new KeyNotFoundException("Nomination not found.");

        if (nomination.WinWeek.Status != WinWeekStatus.Voting && nomination.WinWeek.Status != WinWeekStatus.SuddenDeath)
            throw new InvalidOperationException("Hype meter is only active during voting.");

        nomination.HypeMeterCount++;
        await db.SaveChangesAsync();

        // Both the member and guest paths reach this method (GuestWinOfTheWeekService delegates
        // here), so broadcasting once from here covers both — see both controllers.
        notifier.Broadcast("hype_meter_tapped",
            new { nominationId, count = nomination.HypeMeterCount }, guestAllowed: true);
        return nomination.HypeMeterCount;
    }

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

    public async Task AutoCloseExpiredSuddenDeathAsync(Guid weekId)
    {
        var week = await db.WinWeeks.FindAsync(weekId);
        if (week is null || week.Status != WinWeekStatus.SuddenDeath) return;
        await CheckAndAutoCloseSuddenDeathAsync(week, force: true);
    }

    public async Task AutoResolveExpiredHypeBattleAsync(Guid weekId)
    {
        var week = await db.WinWeeks.FindAsync(weekId);
        if (week is null || week.Status == WinWeekStatus.Closed) return;
        await ResolveHypeBattleAsync(week);
    }

    private async Task ResolveHypeBattleAsync(WinWeek week)
    {
        week.HypeBattleEndsAt = null;

        List<Guid> tiedIds;
        if (!string.IsNullOrEmpty(week.TiedNominationIds))
        {
            tiedIds = JsonSerializer.Deserialize<List<Guid>>(week.TiedNominationIds) ?? [];
        }
        else
        {
            // Tie detected during Voting, before Sudden Death was started -- recompute from current votes.
            var voteCounts = await db.WinNominations
                .Where(n => n.WinWeekId == week.Id)
                .Select(n => new { n.Id, VoteCount = n.Votes.Count })
                .ToListAsync();
            var topCount = voteCounts.Count > 0 ? voteCounts.Max(v => v.VoteCount) : 0;
            tiedIds = topCount > 0
                ? voteCounts.Where(v => v.VoteCount == topCount).Select(v => v.Id).ToList()
                : [];
        }

        if (tiedIds.Count < 2)
        {
            await db.SaveChangesAsync();
            return;
        }

        // A clear vote leader among the tied nominations wins outright -- hype only breaks a continuing tie.
        var votes = await db.WinVotes
            .Where(v => tiedIds.Contains(v.WinNominationId))
            .GroupBy(v => v.WinNominationId)
            .Select(g => new { NominationId = g.Key, VoteCount = g.Count() })
            .ToListAsync();

        var maxVotes = votes.Count > 0 ? votes.Max(v => v.VoteCount) : 0;
        var voteLeaders = votes.Where(v => v.VoteCount == maxVotes).Select(v => v.NominationId).ToList();

        Guid winnerId;
        if (voteLeaders.Count == 1)
        {
            winnerId = voteLeaders[0];
        }
        else
        {
            var hypeCounts = await db.WinNominations
                .Where(n => tiedIds.Contains(n.Id))
                .Select(n => new { n.Id, n.HypeMeterCount })
                .ToListAsync();

            var maxHype = hypeCounts.Count > 0 ? hypeCounts.Max(h => h.HypeMeterCount) : 0;
            var hypeLeaders = hypeCounts.Where(h => h.HypeMeterCount == maxHype).Select(h => h.Id).ToList();

            winnerId = hypeLeaders.Count > 0
                ? hypeLeaders[Random.Shared.Next(hypeLeaders.Count)]
                : tiedIds[Random.Shared.Next(tiedIds.Count)];
        }

        await CloseWeekWithWinnerAsync(week, winnerId);
    }

    private async Task CloseWeekWithWinnerAsync(WinWeek week, Guid winnerNominationId, bool wasRandom = false)
    {
        week.Status = WinWeekStatus.Closed;
        week.WinnerNominationId = winnerNominationId;
        week.ClosedAt = DateTimeOffset.UtcNow;
        week.TiedNominationIds = null;
        week.SuddenDeathEndsAt = null;
        week.HypeBattleEndsAt = null;
        week.QuizEndsAt = null;
        week.QuizQuestion = null;
        week.QuizOptionsJson = null;
        week.QuizCorrectIndex = null;
        week.QuizRevealed = false;
        week.QuizRevealedAt = null;
        week.QuizWinnerMemberId = null;
        week.QuizEliminatedMemberIds = null;
        await db.SaveChangesAsync();

        var winnerNom = await db.WinNominations
            .Include(n => n.Nominee)
            .FirstAsync(n => n.Id == week.WinnerNominationId!.Value);

        await tokens.AwardWeeklyAchievementAsync(winnerNom.NomineeMemberId, week.WeekStart);
        if (winnerNom.TeamMemberId.HasValue)
            await tokens.GrantBonusTokenAsync(winnerNom.TeamMemberId.Value, week.Id);

        winStory.Enqueue(week.Id, $"{winnerNom.Nominee.FirstName} {winnerNom.Nominee.LastName}", winnerNom.Title, winnerNom.Description);

        notifier.Broadcast("voting_closed", new
        {
            weekId = week.Id,
            winnerId = week.WinnerNominationId,
            wasRandom
        }, guestAllowed: true);
    }

    private async Task CheckAndAutoCloseSuddenDeathAsync(WinWeek week, bool force = false)
    {
        if (string.IsNullOrEmpty(week.TiedNominationIds)) return;

        var tiedIds = JsonSerializer.Deserialize<List<Guid>>(week.TiedNominationIds) ?? [];
        if (tiedIds.Count == 0) return;

        var votes = await db.WinVotes
            .Where(v => tiedIds.Contains(v.WinNominationId))
            .GroupBy(v => v.WinNominationId)
            .Select(g => new { NominationId = g.Key, VoteCount = g.Count() })
            .ToListAsync();

        var maxVotes = votes.Count > 0 ? votes.Max(v => v.VoteCount) : 0;
        var leaders = votes.Where(v => v.VoteCount == maxVotes).ToList();

        // Only a clear single leader counts as a real winner; anything else needs force
        if (leaders.Count != 1 && !force) return;

        // Pick winner: clear leader wins outright; ties or no votes get a random pick
        Guid winnerId;
        bool wasRandom;
        if (leaders.Count == 1)
        {
            winnerId = leaders[0].NominationId;
            wasRandom = false;
        }
        else if (leaders.Count > 1)
        {
            winnerId = leaders[Random.Shared.Next(leaders.Count)].NominationId;
            wasRandom = true;
        }
        else
        {
            winnerId = tiedIds[Random.Shared.Next(tiedIds.Count)];
            wasRandom = true;
        }

        await CloseWeekWithWinnerAsync(week, winnerId, wasRandom);
    }

    public async Task ClearExpiredQuizAsync(WinWeek week)
    {
        if (week.Status == WinWeekStatus.Closed || week.QuizQuestion is null) return;

        if (week.QuizRevealed)
        {
            // A winner was found -- wait for the host to explicitly complete the week, don't auto-close.
            if (week.QuizWinnerMemberId.HasValue) return;
            // Nobody got it -- show the reveal for a few seconds, then loop into a fresh question automatically.
            if (week.QuizRevealedAt is null || DateTimeOffset.UtcNow <= week.QuizRevealedAt.Value.AddSeconds(QuizRevealDisplaySeconds)) return;
            await BeginNextQuizRoundAsync(week);
            return;
        }

        if (!week.QuizEndsAt.HasValue || DateTimeOffset.UtcNow <= week.QuizEndsAt.Value) return;
        await TryResolveQuizAsync(week, force: true);
    }

    private static List<Guid> ParseGuidListOrEmpty(string? json) =>
        string.IsNullOrEmpty(json) ? [] : JsonSerializer.Deserialize<List<Guid>>(json) ?? [];

    // The pure elimination decision for one Quiz Duel round, given the still-active nominees, those
    // already eliminated, and who answered correctly this round. Three cases:
    //   • exactly 1 survivor  → that nominee wins.
    //   • 2+ survivors        → everyone active who missed is eliminated; the duel continues.
    //   • 0 survivors         → nobody is eliminated; the round is retried with the same active set,
    //                           so the duel can never deadlock with nobody left.
    // `changed` is true only when the eliminated set grew (case 2), so the caller writes it back only
    // then — preserving the original behaviour of leaving QuizEliminatedMemberIds untouched otherwise.
    internal static (Guid? winner, List<Guid> eliminated, bool changed) DecideQuizRound(
        List<Guid> activeIds, List<Guid> alreadyEliminated, HashSet<Guid> correctIds)
    {
        var survivors = activeIds.Where(correctIds.Contains).ToList();
        if (survivors.Count == 1)
            return (survivors[0], alreadyEliminated, false);
        if (survivors.Count > 1)
        {
            var eliminated = alreadyEliminated.Concat(activeIds.Except(survivors)).Distinct().ToList();
            return (null, eliminated, true);
        }
        return (null, alreadyEliminated, false);
    }

    // Resolves once every still-active nominee has answered, or (force) once the timer has expired,
    // then persists the round outcome (see DecideQuizRound). The ExecuteUpdateAsync below atomically
    // claims the reveal so concurrent polls don't double-broadcast.
    private async Task TryResolveQuizAsync(WinWeek week, bool force)
    {
        if (week.QuizQuestion is null || week.Status == WinWeekStatus.Closed || week.QuizRevealed) return;

        var tiedNomineeIds = await GetTiedNomineeMemberIdsAsync(week);
        var eliminatedIds = ParseGuidListOrEmpty(week.QuizEliminatedMemberIds);
        var activeIds = tiedNomineeIds.Except(eliminatedIds).ToList();

        var answers = await db.WinQuizAnswers.Where(a => a.WinWeekId == week.Id).ToListAsync();
        var answeredIds = answers.Select(a => a.MemberId).ToHashSet();
        var allAnswered = activeIds.Count > 0 && activeIds.All(answeredIds.Contains);

        if (!allAnswered && !force) return;

        var correctThisRound = answers.Where(a => a.IsCorrect).Select(a => a.MemberId).ToHashSet();
        var (winnerMemberId, eliminated, eliminatedChanged) = DecideQuizRound(activeIds, eliminatedIds, correctThisRound);
        var newEliminatedJson = eliminatedChanged ? JsonSerializer.Serialize(eliminated) : week.QuizEliminatedMemberIds;

        var revealedAt = DateTimeOffset.UtcNow;

        // Concurrent polls can all reach this point at once -- atomically claim the reveal so only one
        // caller broadcasts it (always reveal the answer; closing the week is now a separate host action).
        var claimed = await db.WinWeeks
            .Where(w => w.Id == week.Id && !w.QuizRevealed)
            .ExecuteUpdateAsync(w => w
                .SetProperty(x => x.QuizRevealed, true)
                .SetProperty(x => x.QuizRevealedAt, revealedAt)
                .SetProperty(x => x.QuizEndsAt, (DateTimeOffset?)null)
                .SetProperty(x => x.QuizWinnerMemberId, winnerMemberId)
                .SetProperty(x => x.QuizEliminatedMemberIds, newEliminatedJson));
        if (claimed == 0) return;

        notifier.Broadcast("wow_quiz_revealed", new { weekId = week.Id, winnerMemberId }, guestAllowed: true);
    }

    // Auto-loop: nobody won this round, so generate a fresh question and start again, until someone
    // wins or the host stops the duel (StopQuizAsync).
    private async Task BeginNextQuizRoundAsync(WinWeek week)
    {
        db.WinQuizAnswers.RemoveRange(db.WinQuizAnswers.Where(a => a.WinWeekId == week.Id));
        await db.SaveChangesAsync();

        var (question, options, correctIndex, isAiGenerated) = await questionGenerator.GenerateAsync("WowQuiz", "Quiz Duel — generate question", week.QuizDifficultyLevel);
        var optionsJson = JsonSerializer.Serialize(options);
        var endsAt = DateTimeOffset.UtcNow.AddSeconds(45);
        var revealedAtToken = week.QuizRevealedAt;

        var claimed = await db.WinWeeks
            .Where(w => w.Id == week.Id && w.QuizRevealed && w.QuizRevealedAt == revealedAtToken)
            .ExecuteUpdateAsync(w => w
                .SetProperty(x => x.QuizQuestion, question)
                .SetProperty(x => x.QuizOptionsJson, optionsJson)
                .SetProperty(x => x.QuizCorrectIndex, correctIndex)
                .SetProperty(x => x.QuizIsAiGenerated, isAiGenerated)
                .SetProperty(x => x.QuizEndsAt, endsAt)
                .SetProperty(x => x.QuizRevealed, false)
                .SetProperty(x => x.QuizRevealedAt, (DateTimeOffset?)null)
                .SetProperty(x => x.QuizWinnerMemberId, (Guid?)null));
        if (claimed == 0) return;

        if (week.GuestToken is { } token)
            notifier.BroadcastToSession("wow_quiz_started", token, new { question, options, endsAt });
        else
            notifier.Broadcast("wow_quiz_started", new { question, options, endsAt }, guestAllowed: true);
    }

    public async Task<WinWeekDto> CompleteQuizWinnerAsync(Guid memberId, Guid weekId)
    {
        var week = await db.WinWeeks.FindAsync(weekId) ?? throw new KeyNotFoundException("Week not found.");
        if (!week.QuizRevealed || !week.QuizWinnerMemberId.HasValue)
            throw new InvalidOperationException("There's no quiz winner to confirm right now.");

        var winningNomination = await db.WinNominations
            .FirstOrDefaultAsync(n => n.WinWeekId == weekId && n.NomineeMemberId == week.QuizWinnerMemberId.Value);
        if (winningNomination is null)
            throw new InvalidOperationException("The winning nomination could not be found.");

        await CloseWeekWithWinnerAsync(week, winningNomination.Id);
        return await GetCurrentWeekAsync(memberId, week.WinSeriesId)
            ?? throw new InvalidOperationException("Week not found after closing.");
    }

    public async Task<WinWeekDto> StopQuizAsync(Guid memberId, Guid weekId)
    {
        var week = await db.WinWeeks.FindAsync(weekId) ?? throw new KeyNotFoundException("Week not found.");

        week.QuizEndsAt = null;
        week.QuizQuestion = null;
        week.QuizOptionsJson = null;
        week.QuizCorrectIndex = null;
        week.QuizRevealed = false;
        week.QuizRevealedAt = null;
        week.QuizWinnerMemberId = null;
        week.QuizEliminatedMemberIds = null;
        db.WinQuizAnswers.RemoveRange(db.WinQuizAnswers.Where(a => a.WinWeekId == weekId));
        await db.SaveChangesAsync();

        notifier.Broadcast("wow_quiz_stopped", new { weekId }, guestAllowed: true);

        return await GetCurrentWeekAsync(memberId, week.WinSeriesId)
            ?? throw new InvalidOperationException("Week not found after stopping quiz.");
    }

    public async Task<bool> IsQuizEligibleAsync(Guid weekId)
    {
        var week = await db.WinWeeks.FindAsync(weekId);
        if (week is null) return false;

        var tiedNomineeIds = await GetTiedNomineeMemberIdsAsync(week);
        if (tiedNomineeIds.Count < 2) return false;

        return tiedNomineeIds.All(presence.IsMemberConnected);
    }

    private async Task<List<Guid>> GetTiedNomineeMemberIdsAsync(WinWeek week)
    {
        List<Guid> tiedIds;
        if (!string.IsNullOrEmpty(week.TiedNominationIds))
        {
            tiedIds = JsonSerializer.Deserialize<List<Guid>>(week.TiedNominationIds) ?? [];
        }
        else
        {
            var voteCounts = await db.WinNominations
                .Where(n => n.WinWeekId == week.Id)
                .Select(n => new { n.Id, VoteCount = n.Votes.Count })
                .ToListAsync();
            var topCount = voteCounts.Count > 0 ? voteCounts.Max(v => v.VoteCount) : 0;
            tiedIds = topCount > 0
                ? voteCounts.Where(v => v.VoteCount == topCount).Select(v => v.Id).ToList()
                : [];
        }

        if (tiedIds.Count < 2) return [];

        return await db.WinNominations
            .Where(n => tiedIds.Contains(n.Id))
            .Select(n => n.NomineeMemberId)
            .Distinct()
            .ToListAsync();
    }

    public async Task<WinWeekDto> StartQuizAsync(Guid memberId, Guid weekId, int? difficultyLevel = null)
    {
        var week = await db.WinWeeks.Include(w => w.Series).FirstOrDefaultAsync(w => w.Id == weekId)
            ?? throw new KeyNotFoundException("Week not found.");

        if (week.SuddenDeathEndsAt.HasValue || week.HypeBattleEndsAt.HasValue)
            throw new InvalidOperationException("Stop the other tiebreaker before starting Quiz Duel.");

        if (!await IsQuizEligibleAsync(weekId))
            throw new InvalidOperationException("Quiz Duel needs every tied nominee to be logged in right now.");

        db.WinQuizAnswers.RemoveRange(db.WinQuizAnswers.Where(a => a.WinWeekId == weekId));

        // Persisted on the week (not just passed per-call) so BeginNextQuizRoundAsync's
        // auto-loop keeps using the host's chosen difficulty across rounds.
        week.QuizDifficultyLevel = difficultyLevel.HasValue ? Math.Clamp(difficultyLevel.Value, 1, 15) : null;

        var (question, options, correctIndex, isAiGenerated) = await questionGenerator.GenerateAsync("WowQuiz", "Quiz Duel — generate question", week.QuizDifficultyLevel);

        week.QuizQuestion = question;
        week.QuizOptionsJson = JsonSerializer.Serialize(options);
        week.QuizCorrectIndex = correctIndex;
        week.QuizIsAiGenerated = isAiGenerated;
        week.QuizEndsAt = DateTimeOffset.UtcNow.AddSeconds(45);
        week.QuizRevealed = false;
        week.QuizRevealedAt = null;
        week.QuizWinnerMemberId = null;
        week.QuizEliminatedMemberIds = null;
        await db.SaveChangesAsync();

        var endsAt = week.QuizEndsAt;
        if (week.GuestToken is { } token)
            notifier.BroadcastToSession("wow_quiz_started", token, new { question, options, endsAt });
        else
            notifier.Broadcast("wow_quiz_started", new { question, options, endsAt }, guestAllowed: true);

        return await GetCurrentWeekAsync(memberId, week.WinSeriesId)
            ?? throw new InvalidOperationException("Week not found after starting quiz.");
    }

    public async Task<bool> SubmitQuizAnswerAsync(Guid memberId, Guid weekId, int selectedIndex)
    {
        var week = await db.WinWeeks.FindAsync(weekId)
            ?? throw new KeyNotFoundException("Week not found.");

        if (week.QuizEndsAt is null || DateTimeOffset.UtcNow > week.QuizEndsAt.Value)
            throw new InvalidOperationException("There is no active quiz right now.");

        var tiedNomineeIds = await GetTiedNomineeMemberIdsAsync(week);
        if (!tiedNomineeIds.Contains(memberId))
            throw new InvalidOperationException("Only the tied nominees can answer this quiz.");
        var eliminatedIds = ParseGuidListOrEmpty(week.QuizEliminatedMemberIds);
        if (eliminatedIds.Contains(memberId))
            throw new InvalidOperationException("You've been eliminated from this duel.");

        var alreadyAnswered = await db.WinQuizAnswers.AnyAsync(a => a.WinWeekId == weekId && a.MemberId == memberId);
        if (alreadyAnswered)
            throw new InvalidOperationException("You've already submitted an answer.");

        var isCorrect = selectedIndex == week.QuizCorrectIndex;
        db.WinQuizAnswers.Add(new WinQuizAnswer
        {
            WinWeekId = weekId,
            MemberId = memberId,
            SelectedIndex = selectedIndex,
            IsCorrect = isCorrect
        });
        await db.SaveChangesAsync();

        notifier.Broadcast("wow_quiz_answer_submitted", new { weekId, memberId }, guestAllowed: true);

        // Doesn't resolve yet just because this answer is correct -- waits for everyone to answer
        // (or the timer to expire) so nobody sees "wrong" the instant they submit.
        await TryResolveQuizAsync(week, force: false);
        return isCorrect;
    }

}
