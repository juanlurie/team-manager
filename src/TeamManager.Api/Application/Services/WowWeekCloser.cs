using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.Realtime;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

/// <summary>
/// Finalises a Win of the Week with a chosen winner: marks it Closed, clears every tie-breaker /
/// quiz field, awards the winner's achievement + points and the nominator's bonus token, kicks off
/// the win story, and broadcasts voting_closed.
///
/// Lives on its own because it's the single shared "close" invoked from two directions — the host's
/// explicit CloseWeekAsync (week lifecycle) and the automatic tie-breaker resolvers. Extracting it
/// breaks what would otherwise be a circular dependency between the week service and the tie-breaker
/// service (both need to close).
/// </summary>
public class WowWeekCloser(AppDbContext db, WowTokenService tokens, IWinStoryGenerator winStory, IWowNotifier notifier)
{
    /// <param name="wasRandom">True when the winner was picked at random (a dead-heat tie-break),
    /// which the client uses to decide whether to play the spinner animation.</param>
    public async Task CloseWithWinnerAsync(WinWeek week, Guid winnerNominationId, bool wasRandom = false)
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
}
