using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.WinOfTheWeek;
using TeamManager.Api.Application.Realtime;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

/// <summary>
/// The vote-tie tie-breakers for Win of the Week: Sudden Death and the Hype Battle (the Quiz Duel is
/// not here yet — a follow-up). Peeled off WinOfTheWeekService. Resolution closes the week through
/// WowWeekCloser, which is why that had to come out first (it's shared with the host close path).
///
/// Methods here return primitives, never the week DTO — the god service's public commands stay thin
/// facades that call these and then build the read model, so there's no dependency back onto the
/// read path.
/// </summary>
public class WowTiebreakerService(AppDbContext db, IWowNotifier notifier, WowWeekCloser weekCloser)
{
    // ─── Sudden death ───

    public async Task StartSuddenDeathAsync(Guid seriesId, StartSuddenDeathRequest request)
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
    }

    public async Task AutoCloseExpiredSuddenDeathAsync(Guid weekId)
    {
        var week = await db.WinWeeks.FindAsync(weekId);
        if (week is null || week.Status != WinWeekStatus.SuddenDeath) return;
        await CheckAndAutoCloseSuddenDeathAsync(week, force: true);
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

        await weekCloser.CloseWithWinnerAsync(week, winnerId, wasRandom);
    }

    // ─── Hype battle ───

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

        await weekCloser.CloseWithWinnerAsync(week, winnerId);
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

    // The most-recent non-closed week for a series, or null.
    private async Task<WinWeek?> GetActiveNonClosedWeekAsync(Guid seriesId) =>
        await db.WinWeeks
            .Where(w => w.WinSeriesId == seriesId && w.Status != WinWeekStatus.Closed)
            .OrderByDescending(w => w.WeekStart)
            .FirstOrDefaultAsync();
}
