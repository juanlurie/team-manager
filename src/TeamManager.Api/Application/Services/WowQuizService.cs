using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.Realtime;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

/// <summary>
/// The Quiz Duel tie-breaker for Win of the Week: the last of the three tie-breakers to be peeled off
/// WinOfTheWeekService (Sudden Death and the Hype Battle live in WowTiebreakerService). Resolution
/// closes the week through WowWeekCloser, same as the other tie-breakers.
///
/// Following the tie-breaker split, the command methods here return primitives (the series id, or a
/// bool), never the week DTO — the god service's public commands stay thin facades that call these
/// and then build the read model, so there's no dependency back onto the read path.
/// </summary>
public class WowQuizService(
    AppDbContext db,
    QuizQuestionGeneratorService questionGenerator,
    WowWeekCloser weekCloser,
    IWowNotifier notifier,
    IWowPresence presence)
{
    internal const int QuizRevealDisplaySeconds = 5;

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

    internal static List<Guid> ParseGuidListOrEmpty(string? json) =>
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
            notifier.BroadcastToSession("wow_quiz_started", token, new { endsAt });
        else
            // Only the timer goes on the wire — the question/options are fetched via the caller's
            // authenticated (member) or token-scoped (guest) GET, so trivia never broadcasts globally.
            notifier.Broadcast("wow_quiz_started", new { endsAt }, guestAllowed: true);
    }

    public async Task<Guid> CompleteQuizWinnerAsync(Guid weekId)
    {
        var week = await db.WinWeeks.FindAsync(weekId) ?? throw new KeyNotFoundException("Week not found.");
        if (!week.QuizRevealed || !week.QuizWinnerMemberId.HasValue)
            throw new InvalidOperationException("There's no quiz winner to confirm right now.");

        var winningNomination = await db.WinNominations
            .FirstOrDefaultAsync(n => n.WinWeekId == weekId && n.NomineeMemberId == week.QuizWinnerMemberId.Value);
        if (winningNomination is null)
            throw new InvalidOperationException("The winning nomination could not be found.");

        await weekCloser.CloseWithWinnerAsync(week, winningNomination.Id);
        return week.WinSeriesId;
    }

    public async Task<Guid> StopQuizAsync(Guid weekId)
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

        return week.WinSeriesId;
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

    public async Task<Guid> StartQuizAsync(Guid weekId, int? difficultyLevel = null)
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
            notifier.BroadcastToSession("wow_quiz_started", token, new { endsAt });
        else
            // Only the timer goes on the wire — the question/options are fetched via the caller's
            // authenticated (member) or token-scoped (guest) GET, so trivia never broadcasts globally.
            notifier.Broadcast("wow_quiz_started", new { endsAt }, guestAllowed: true);

        return week.WinSeriesId;
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
