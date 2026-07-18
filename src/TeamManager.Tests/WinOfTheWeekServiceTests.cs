using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.WinOfTheWeek;
using TeamManager.Api.Application.Realtime;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;
using Xunit;

namespace TeamManager.Tests;

/// <summary>Records broadcasts instead of sending them, so assertions can check what was published.</summary>
internal sealed class FakeWowNotifier : IWowNotifier
{
    public readonly List<string> Events = [];
    public void Broadcast(string type, object data, bool guestAllowed = false) => Events.Add(type);
    public void BroadcastToSession(string type, string sessionKey, object data) => Events.Add(type);
}

/// <summary>Presence the test controls outright — the whole point of A3: no live socket needed.</summary>
internal sealed class StubWowPresence : IWowPresence
{
    public HashSet<Guid> Connected { get; } = [];
    public bool IsMemberConnected(Guid memberId) => Connected.Contains(memberId);
    public int GetSessionCount(string sessionKey) => 0;
}

/// <summary>No-op win-story generator: closing a week must not spin up a real background AI task.</summary>
internal sealed class NullWinStoryGenerator : IWinStoryGenerator
{
    public void Enqueue(Guid weekId, string winnerName, string title, string? description) { }
}

/// <summary>
/// First unit tests of WinOfTheWeekService. Before A3 this class could not be constructed without a
/// running WebSocket server (it called WebSocketMiddleware's statics directly); these exist to prove
/// that coupling is gone and to anchor the Quiz Duel eligibility rule. EF InMemory; every entity gets
/// an explicit Id.
/// </summary>
public class WinOfTheWeekServiceTests
{
    private static AppDbContext NewDb() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"wow-{Guid.NewGuid()}")
            .Options);

    private static WinOfTheWeekService Svc(AppDbContext db, IWowPresence presence, IWowNotifier? notifier = null)
    {
        // questionGenerator is only touched by the quiz-generation path; winStory is a no-op so a
        // close never spins up a real background task. Constructed cheaply, no DI container needed.
        var questionGenerator = new QuizQuestionGeneratorService(db, new AiPromptExecutorService(db));
        return new WinOfTheWeekService(db, questionGenerator, new NullWinStoryGenerator(), notifier ?? new FakeWowNotifier(), presence);
    }

    private static TeamMember Member() => new()
    {
        Id = Guid.NewGuid(), FirstName = "Test", LastName = "Member",
        Email = $"{Guid.NewGuid():N}@team.local", Role = MemberRole.TeamLead, IsActive = true,
    };

    private static async Task<(WinWeek week, TeamMember a, TeamMember b)> SeedTiedWeekAsync(AppDbContext db)
    {
        var series = new WinSeries { Id = Guid.NewGuid(), Name = "S", CreatedByMemberId = Guid.NewGuid() };
        var week = new WinWeek
        {
            Id = Guid.NewGuid(), WinSeriesId = series.Id, Status = WinWeekStatus.Voting,
            WeekStart = new DateOnly(2026, 7, 13), WeekEnd = new DateOnly(2026, 7, 19),
            CreatedByMemberId = series.CreatedByMemberId,
        };
        var nomineeA = Member();
        var nomineeB = Member();
        var nomA = new WinNomination { Id = Guid.NewGuid(), WinWeekId = week.Id, NomineeMemberId = nomineeA.Id, Title = "A" };
        var nomB = new WinNomination { Id = Guid.NewGuid(), WinWeekId = week.Id, NomineeMemberId = nomineeB.Id, Title = "B" };
        // A 1–1 vote tie across the two nominations.
        week.TiedNominationIds = System.Text.Json.JsonSerializer.Serialize(new[] { nomA.Id, nomB.Id });

        db.AddRange(series, week, nomineeA, nomineeB, nomA, nomB);
        await db.SaveChangesAsync();
        return (week, nomineeA, nomineeB);
    }

    /// <summary>A week in the given status with two tied nominations. Each nomination carries a
    /// distinct submitter (TeamMemberId) and nominee, so achievement/bonus-token wiring is exercisable.</summary>
    private static async Task<(WinWeek week, WinNomination nomA, WinNomination nomB)> SeedTieBreakerWeekAsync(
        AppDbContext db, WinWeekStatus status)
    {
        var series = new WinSeries { Id = Guid.NewGuid(), Name = "S", CreatedByMemberId = Guid.NewGuid() };
        var week = new WinWeek
        {
            Id = Guid.NewGuid(), WinSeriesId = series.Id, Status = status,
            WeekStart = new DateOnly(2026, 7, 13), WeekEnd = new DateOnly(2026, 7, 19),
            CreatedByMemberId = series.CreatedByMemberId,
        };
        var submitterA = Member();
        var submitterB = Member();
        var nomineeA = Member();
        var nomineeB = Member();
        var nomA = new WinNomination { Id = Guid.NewGuid(), WinWeekId = week.Id, TeamMemberId = submitterA.Id, NomineeMemberId = nomineeA.Id, Title = "A" };
        var nomB = new WinNomination { Id = Guid.NewGuid(), WinWeekId = week.Id, TeamMemberId = submitterB.Id, NomineeMemberId = nomineeB.Id, Title = "B" };
        week.TiedNominationIds = System.Text.Json.JsonSerializer.Serialize(new[] { nomA.Id, nomB.Id });

        db.AddRange(series, week, submitterA, submitterB, nomineeA, nomineeB, nomA, nomB);
        await db.SaveChangesAsync();
        return (week, nomA, nomB);
    }

    private static async Task AddVotesAsync(AppDbContext db, Guid nominationId, int count)
    {
        for (var i = 0; i < count; i++)
            db.Add(new WinVote { Id = Guid.NewGuid(), WinNominationId = nominationId, TeamMemberId = Guid.NewGuid() });
        await db.SaveChangesAsync();
    }

    private static WinWeek ReloadWeek(AppDbContext db, Guid weekId)
    {
        db.ChangeTracker.Clear();
        return db.WinWeeks.Single(w => w.Id == weekId);
    }

    // ─── Sudden death ───

    [Fact]
    public async Task SuddenDeath_clear_vote_leader_wins_outright()
    {
        await using var db = NewDb();
        var (week, nomA, nomB) = await SeedTieBreakerWeekAsync(db, WinWeekStatus.SuddenDeath);
        await AddVotesAsync(db, nomA.Id, 2);
        await AddVotesAsync(db, nomB.Id, 1);

        await Svc(db, new StubWowPresence()).AutoCloseExpiredSuddenDeathAsync(week.Id);

        var closed = ReloadWeek(db, week.Id);
        Assert.Equal(WinWeekStatus.Closed, closed.Status);
        Assert.Equal(nomA.Id, closed.WinnerNominationId);
    }

    [Fact]
    public async Task SuddenDeath_close_clears_all_tiebreaker_state()
    {
        await using var db = NewDb();
        var (week, nomA, nomB) = await SeedTieBreakerWeekAsync(db, WinWeekStatus.SuddenDeath);
        await AddVotesAsync(db, nomA.Id, 2);
        await AddVotesAsync(db, nomB.Id, 1);

        await Svc(db, new StubWowPresence()).AutoCloseExpiredSuddenDeathAsync(week.Id);

        var closed = ReloadWeek(db, week.Id);
        Assert.Null(closed.TiedNominationIds);
        Assert.Null(closed.SuddenDeathEndsAt);
        Assert.Null(closed.HypeBattleEndsAt);
        Assert.NotNull(closed.ClosedAt);
    }

    [Fact]
    public async Task SuddenDeath_tie_still_produces_a_winner_from_the_tied_set()
    {
        await using var db = NewDb();
        var (week, nomA, nomB) = await SeedTieBreakerWeekAsync(db, WinWeekStatus.SuddenDeath);
        await AddVotesAsync(db, nomA.Id, 1);
        await AddVotesAsync(db, nomB.Id, 1); // dead heat -> forced random pick among the two

        await Svc(db, new StubWowPresence()).AutoCloseExpiredSuddenDeathAsync(week.Id);

        var closed = ReloadWeek(db, week.Id);
        Assert.Equal(WinWeekStatus.Closed, closed.Status);
        Assert.Contains(closed.WinnerNominationId, new Guid?[] { nomA.Id, nomB.Id });
    }

    [Fact]
    public async Task SuddenDeath_autoclose_is_a_noop_when_week_is_not_in_sudden_death()
    {
        await using var db = NewDb();
        var (week, nomA, nomB) = await SeedTieBreakerWeekAsync(db, WinWeekStatus.Voting);
        await AddVotesAsync(db, nomA.Id, 2);

        await Svc(db, new StubWowPresence()).AutoCloseExpiredSuddenDeathAsync(week.Id);

        var reloaded = ReloadWeek(db, week.Id);
        Assert.Equal(WinWeekStatus.Voting, reloaded.Status);
        Assert.Null(reloaded.WinnerNominationId);
    }

    // ─── Hype battle ───

    [Fact]
    public async Task HypeBattle_clear_vote_leader_wins_and_hype_is_ignored()
    {
        await using var db = NewDb();
        var (week, nomA, nomB) = await SeedTieBreakerWeekAsync(db, WinWeekStatus.SuddenDeath);
        await AddVotesAsync(db, nomA.Id, 2); // A leads on votes
        await AddVotesAsync(db, nomB.Id, 1);
        nomB.HypeMeterCount = 999;           // B has more hype, but votes decide first
        await db.SaveChangesAsync();

        await Svc(db, new StubWowPresence()).AutoResolveExpiredHypeBattleAsync(week.Id);

        var closed = ReloadWeek(db, week.Id);
        Assert.Equal(WinWeekStatus.Closed, closed.Status);
        Assert.Equal(nomA.Id, closed.WinnerNominationId);
    }

    [Fact]
    public async Task HypeBattle_breaks_a_vote_tie_by_higher_hype()
    {
        await using var db = NewDb();
        var (week, nomA, nomB) = await SeedTieBreakerWeekAsync(db, WinWeekStatus.SuddenDeath);
        await AddVotesAsync(db, nomA.Id, 1); // vote tie
        await AddVotesAsync(db, nomB.Id, 1);
        nomB.HypeMeterCount = 5;             // B wins on hype
        await db.SaveChangesAsync();

        await Svc(db, new StubWowPresence()).AutoResolveExpiredHypeBattleAsync(week.Id);

        var closed = ReloadWeek(db, week.Id);
        Assert.Equal(WinWeekStatus.Closed, closed.Status);
        Assert.Equal(nomB.Id, closed.WinnerNominationId);
    }

    // ─── Achievement + bonus token on close ───

    [Fact]
    public async Task Closing_awards_the_nominee_the_achievement_and_points()
    {
        await using var db = NewDb();
        db.Add(new Achievement { Id = Guid.NewGuid(), Key = "win-of-the-week", Name = "WoW", Points = 10 });
        await db.SaveChangesAsync();
        var (week, nomA, nomB) = await SeedTieBreakerWeekAsync(db, WinWeekStatus.SuddenDeath);
        await AddVotesAsync(db, nomA.Id, 2);

        await Svc(db, new StubWowPresence()).AutoCloseExpiredSuddenDeathAsync(week.Id);

        db.ChangeTracker.Clear();
        var winnerNomineeId = db.WinNominations.Single(n => n.Id == nomA.Id).NomineeMemberId;
        Assert.True(db.MemberAchievements.Any(ma => ma.TeamMemberId == winnerNomineeId));
        var award = db.PointAwards.SingleOrDefault(p => p.TeamMemberId == winnerNomineeId);
        Assert.NotNull(award);
        Assert.Equal(10, award!.Points);
    }

    [Fact]
    public async Task Closing_grants_the_winning_nominator_a_bonus_token()
    {
        await using var db = NewDb();
        var (week, nomA, nomB) = await SeedTieBreakerWeekAsync(db, WinWeekStatus.SuddenDeath);
        var submitterId = nomA.TeamMemberId!.Value;
        await AddVotesAsync(db, nomA.Id, 2);

        await Svc(db, new StubWowPresence()).AutoCloseExpiredSuddenDeathAsync(week.Id);

        db.ChangeTracker.Clear();
        Assert.True(db.WowMemberTokens.Any(t => t.TeamMemberId == submitterId && t.Source == "WinnerBonus"));
    }

    [Fact]
    public async Task Achievement_is_not_awarded_twice_in_the_same_month()
    {
        await using var db = NewDb();
        db.Add(new Achievement { Id = Guid.NewGuid(), Key = "win-of-the-week", Name = "WoW", Points = 10 });
        await db.SaveChangesAsync();

        // Same nominee wins two different weeks in the same month.
        var (week1, nom1A, _) = await SeedTieBreakerWeekAsync(db, WinWeekStatus.SuddenDeath);
        var winnerNomineeId = db.WinNominations.Single(n => n.Id == nom1A.Id).NomineeMemberId;
        await AddVotesAsync(db, nom1A.Id, 2);
        await Svc(db, new StubWowPresence()).AutoCloseExpiredSuddenDeathAsync(week1.Id);

        // Second week, force the SAME nominee onto the winning nomination.
        var (week2, nom2A, _) = await SeedTieBreakerWeekAsync(db, WinWeekStatus.SuddenDeath);
        nom2A.NomineeMemberId = winnerNomineeId;
        await db.SaveChangesAsync();
        await AddVotesAsync(db, nom2A.Id, 2);
        await Svc(db, new StubWowPresence()).AutoCloseExpiredSuddenDeathAsync(week2.Id);

        db.ChangeTracker.Clear();
        Assert.Equal(1, db.MemberAchievements.Count(ma => ma.TeamMemberId == winnerNomineeId));
    }

    // ─── Token economy + budgets ("the money") ───

    private static async Task<(Guid seriesId, WinWeek week, TeamMember me, TeamMember nominee)> SeedSimpleWeekAsync(
        AppDbContext db, WinWeekStatus status)
    {
        var series = new WinSeries { Id = Guid.NewGuid(), Name = "S", CreatedByMemberId = Guid.NewGuid() };
        var week = new WinWeek
        {
            Id = Guid.NewGuid(), WinSeriesId = series.Id, Status = status,
            WeekStart = new DateOnly(2026, 7, 13), WeekEnd = new DateOnly(2026, 7, 19),
            CreatedByMemberId = series.CreatedByMemberId,
        };
        var me = Member();
        var nominee = Member();
        db.AddRange(series, week, me, nominee);
        await db.SaveChangesAsync();
        return (series.Id, week, me, nominee);
    }

    [Fact]
    public async Task Nomination_budget_caps_at_three_per_person()
    {
        await using var db = NewDb();
        var (sid, _, me, nominee) = await SeedSimpleWeekAsync(db, WinWeekStatus.Nominating);
        var svc = Svc(db, new StubWowPresence());
        var req = new CreateNominationRequest(nominee.Id, "Nice work", null);

        for (var i = 0; i < 3; i++) await svc.CreateNominationAsync(me.Id, req, sid);

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateNominationAsync(me.Id, req, sid));
    }

    [Fact]
    public async Task Vote_budget_caps_at_three_per_week()
    {
        await using var db = NewDb();
        var (_, week, me, nominee) = await SeedSimpleWeekAsync(db, WinWeekStatus.Voting);
        // Four nominations to vote on, so the cap (not "already voted this one") is what bites.
        var noms = Enumerable.Range(0, 4).Select(_ =>
            new WinNomination { Id = Guid.NewGuid(), WinWeekId = week.Id, NomineeMemberId = nominee.Id, Title = "n" }).ToList();
        db.AddRange(noms);
        await db.SaveChangesAsync();
        var svc = Svc(db, new StubWowPresence());

        for (var i = 0; i < 3; i++) await svc.VoteAsync(me.Id, noms[i].Id);

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.VoteAsync(me.Id, noms[3].Id));
    }

    [Fact]
    public async Task Voting_twice_for_the_same_nomination_is_rejected()
    {
        await using var db = NewDb();
        var (_, week, me, nominee) = await SeedSimpleWeekAsync(db, WinWeekStatus.Voting);
        var nom = new WinNomination { Id = Guid.NewGuid(), WinWeekId = week.Id, NomineeMemberId = nominee.Id, Title = "n" };
        db.Add(nom);
        await db.SaveChangesAsync();
        var svc = Svc(db, new StubWowPresence());

        await svc.VoteAsync(me.Id, nom.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.VoteAsync(me.Id, nom.Id));
    }

    [Fact]
    public async Task Token_balance_grants_exactly_one_weekly_token_idempotently()
    {
        await using var db = NewDb();
        var (sid, _, me, _) = await SeedSimpleWeekAsync(db, WinWeekStatus.Voting);
        var svc = Svc(db, new StubWowPresence());

        Assert.Equal(1, await svc.GetTokenBalanceAsync(me.Id, sid));
        Assert.Equal(1, await svc.GetTokenBalanceAsync(me.Id, sid)); // second call must not double-grant
    }

    [Fact]
    public async Task Applying_a_power_up_spends_the_weekly_token()
    {
        await using var db = NewDb();
        var (sid, week, me, nominee) = await SeedSimpleWeekAsync(db, WinWeekStatus.Voting);
        var nom = new WinNomination { Id = Guid.NewGuid(), WinWeekId = week.Id, TeamMemberId = me.Id, NomineeMemberId = nominee.Id, Title = "n" };
        db.Add(nom);
        await db.SaveChangesAsync();
        var svc = Svc(db, new StubWowPresence());

        await svc.ApplyPowerUpAsync(me.Id, nom.Id, "Spotlight");

        Assert.Equal(0, await svc.GetTokenBalanceAsync(me.Id, sid));
    }

    [Fact]
    public async Task A_second_power_up_with_no_token_left_is_rejected()
    {
        await using var db = NewDb();
        var (_, week, me, nominee) = await SeedSimpleWeekAsync(db, WinWeekStatus.Voting);
        var nom1 = new WinNomination { Id = Guid.NewGuid(), WinWeekId = week.Id, TeamMemberId = me.Id, NomineeMemberId = nominee.Id, Title = "n1" };
        var nom2 = new WinNomination { Id = Guid.NewGuid(), WinWeekId = week.Id, TeamMemberId = me.Id, NomineeMemberId = nominee.Id, Title = "n2" };
        db.AddRange(nom1, nom2);
        await db.SaveChangesAsync();
        var svc = Svc(db, new StubWowPresence());

        await svc.ApplyPowerUpAsync(me.Id, nom1.Id, "Spotlight"); // spends the one weekly token

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.ApplyPowerUpAsync(me.Id, nom2.Id, "Spotlight"));
    }

    // ─── Quiz Duel elimination model (pure decision) ───
    // The resolver itself uses ExecuteUpdateAsync (unsupported by EF InMemory) to atomically claim
    // the reveal; DecideQuizRound is the pure elimination logic pulled out of it, tested here
    // exhaustively. Guards the round rules whose inline comment literally argued with itself.

    private static (Guid? winner, List<Guid> eliminated, bool changed) Decide(
        IEnumerable<Guid> active, IEnumerable<Guid> alreadyOut, IEnumerable<Guid> correct) =>
        WinOfTheWeekService.DecideQuizRound(active.ToList(), alreadyOut.ToList(), correct.ToHashSet());

    [Fact]
    public void Quiz_exactly_one_correct_wins_outright()
    {
        var a = Guid.NewGuid(); var b = Guid.NewGuid();
        var (winner, _, changed) = Decide(active: [a, b], alreadyOut: [], correct: [a]);
        Assert.Equal(a, winner);
        Assert.False(changed); // no elimination write when someone wins
    }

    [Fact]
    public void Quiz_two_survive_eliminates_the_rest_and_continues()
    {
        var a = Guid.NewGuid(); var b = Guid.NewGuid(); var c = Guid.NewGuid();
        var (winner, eliminated, changed) = Decide(active: [a, b, c], alreadyOut: [], correct: [a, b]);
        Assert.Null(winner);            // no winner yet — duel continues
        Assert.True(changed);
        Assert.Contains(c, eliminated); // the one who missed is out
        Assert.DoesNotContain(a, eliminated);
        Assert.DoesNotContain(b, eliminated);
    }

    [Fact]
    public void Quiz_nobody_correct_eliminates_nobody_and_retries()
    {
        var a = Guid.NewGuid(); var b = Guid.NewGuid();
        var (winner, eliminated, changed) = Decide(active: [a, b], alreadyOut: [], correct: []);
        Assert.Null(winner);
        Assert.False(changed);   // the round is wasted and retried with the same set
        Assert.Empty(eliminated);
    }

    [Fact]
    public void Quiz_carries_prior_eliminations_forward()
    {
        var a = Guid.NewGuid(); var b = Guid.NewGuid(); var c = Guid.NewGuid(); var old = Guid.NewGuid();
        // old was already out; a, b, c active this round; a & b survive -> c joins the eliminated.
        var (winner, eliminated, changed) = Decide(active: [a, b, c], alreadyOut: [old], correct: [a, b]);
        Assert.Null(winner);
        Assert.True(changed);
        Assert.Contains(old, eliminated);
        Assert.Contains(c, eliminated);
    }

    [Fact]
    public void Quiz_last_survivor_of_a_reduced_field_wins()
    {
        var a = Guid.NewGuid(); var b = Guid.NewGuid(); var old = Guid.NewGuid();
        // Only a & b are active (old already out); a alone is correct -> a wins.
        var (winner, _, _) = Decide(active: [a, b], alreadyOut: [old], correct: [a]);
        Assert.Equal(a, winner);
    }

    [Fact]
    public async Task Quiz_is_ineligible_when_a_tied_nominee_is_offline()
    {
        await using var db = NewDb();
        var (week, a, _) = await SeedTiedWeekAsync(db);
        var presence = new StubWowPresence();
        presence.Connected.Add(a.Id); // only one of the two tied nominees is connected

        var eligible = await Svc(db, presence).IsQuizEligibleAsync(week.Id);

        Assert.False(eligible);
    }

    [Fact]
    public async Task Quiz_is_eligible_when_every_tied_nominee_is_online()
    {
        await using var db = NewDb();
        var (week, a, b) = await SeedTiedWeekAsync(db);
        var presence = new StubWowPresence();
        presence.Connected.Add(a.Id);
        presence.Connected.Add(b.Id);

        var eligible = await Svc(db, presence).IsQuizEligibleAsync(week.Id);

        Assert.True(eligible);
    }
}
