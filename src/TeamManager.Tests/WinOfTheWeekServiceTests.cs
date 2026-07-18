using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TeamManager.Api.Application.Realtime;
using TeamManager.Api.Application.Services;
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
        // scopeFactory is only touched by the background win-story task (fires on close), which these
        // tests don't reach; questionGenerator only by the quiz-generation path. Constructed cheaply.
        var scopeFactory = new ServiceCollection().BuildServiceProvider().GetRequiredService<IServiceScopeFactory>();
        var questionGenerator = new QuizQuestionGeneratorService(db, new AiPromptExecutorService(db));
        return new WinOfTheWeekService(db, scopeFactory, questionGenerator, notifier ?? new FakeWowNotifier(), presence);
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
