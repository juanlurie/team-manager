using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.RetroBoard;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;
using Xunit;

namespace TeamManager.Tests;

/// <summary>
/// Guards the high-risk RetroBoard invariants: feedback anonymity, score validation/upsert,
/// the close/reopen/archive lifecycle, and the close-lock on board mutations. Uses the EF
/// InMemory provider; every entity is seeded with an explicit Id so nothing depends on the
/// store's uuid default. Service methods here only ever do single same-type inserts.
/// </summary>
public class RetroBoardServiceTests
{
    private static AppDbContext NewDb() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"rb-{Guid.NewGuid()}")
            .Options);

    private static RetroBoardService Svc(AppDbContext db) => new(db, new AiPromptExecutorService(db));

    private static TeamMember Member(string first = "Test") =>
        new()
        {
            Id = Guid.NewGuid(),
            FirstName = first,
            LastName = "Member",
            Email = $"{Guid.NewGuid():N}@team.local",
            Role = MemberRole.TeamLead,
            IsActive = true,
        };

    private static RetroBoardSession Session(Guid createdBy, string status = "draft") =>
        new()
        {
            Id = Guid.NewGuid(),
            CreatedByMemberId = createdBy,
            Title = "Test Retro",
            Phase = "setup",
            Status = status,
            AllowAnonymous = true,
        };

    // ---- Feedback anonymity ----

    [Fact]
    public async Task Feedback_aggregate_hidden_from_participant_shown_to_facilitator()
    {
        using var db = NewDb();
        var facil = Member("Fac");
        var part = Member("Par");
        db.TeamMembers.AddRange(facil, part);
        var s = Session(facil.Id);                         // creator is a facilitator
        db.RetroBoardSessions.Add(s);
        var prompt = new RetroBoardFeedbackPrompt { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, Text = "Flow", SortOrder = 0 };
        db.RetroBoardFeedbackPrompts.Add(prompt);
        db.RetroBoardFeedbackResponses.AddRange(
            new RetroBoardFeedbackResponse { Id = Guid.NewGuid(), RetroBoardFeedbackPromptId = prompt.Id, MemberId = facil.Id, Score = 5, Comment = "Great" },
            new RetroBoardFeedbackResponse { Id = Guid.NewGuid(), RetroBoardFeedbackPromptId = prompt.Id, MemberId = part.Id, Score = 3, Comment = "Rushed" });
        await db.SaveChangesAsync();
        var svc = Svc(db);

        var asParticipant = (await svc.GetSessionAsync(s.Id, part.Id))!.FeedbackPrompts.Single();
        Assert.Equal(3, asParticipant.MyScore);            // sees their own response
        Assert.Null(asParticipant.AverageScore);           // but not the aggregate
        Assert.Equal(0, asParticipant.ResponseCount);
        Assert.Empty(asParticipant.Comments);

        var asFacilitator = (await svc.GetSessionAsync(s.Id, facil.Id))!.FeedbackPrompts.Single();
        Assert.Equal(5, asFacilitator.MyScore);
        Assert.Equal(4, asFacilitator.AverageScore);       // (5 + 3) / 2
        Assert.Equal(2, asFacilitator.ResponseCount);
        Assert.Equal(2, asFacilitator.Comments.Count);
    }

    // ---- Score validation + upsert ----

    [Theory]
    [InlineData(0, false)]
    [InlineData(6, false)]
    [InlineData(1, true)]
    [InlineData(5, true)]
    public async Task RespondFeedback_rejects_scores_outside_1_to_5(int score, bool expectedOk)
    {
        using var db = NewDb();
        var m = Member();
        db.TeamMembers.Add(m);
        var s = Session(m.Id);
        db.RetroBoardSessions.Add(s);
        var prompt = new RetroBoardFeedbackPrompt { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, Text = "Flow" };
        db.RetroBoardFeedbackPrompts.Add(prompt);
        await db.SaveChangesAsync();

        var ok = await Svc(db).RespondFeedbackAsync(s.Id, m.Id, prompt.Id, score, null);
        Assert.Equal(expectedOk, ok);
    }

    [Fact]
    public async Task RespondFeedback_upserts_a_single_row_per_member()
    {
        using var db = NewDb();
        var m = Member();
        db.TeamMembers.Add(m);
        var s = Session(m.Id);
        db.RetroBoardSessions.Add(s);
        var prompt = new RetroBoardFeedbackPrompt { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, Text = "Flow" };
        db.RetroBoardFeedbackPrompts.Add(prompt);
        await db.SaveChangesAsync();
        var svc = Svc(db);

        Assert.True(await svc.RespondFeedbackAsync(s.Id, m.Id, prompt.Id, 3, "first"));
        Assert.True(await svc.RespondFeedbackAsync(s.Id, m.Id, prompt.Id, 5, "changed my mind"));

        var rows = await db.RetroBoardFeedbackResponses.Where(r => r.RetroBoardFeedbackPromptId == prompt.Id).ToListAsync();
        Assert.Single(rows);
        Assert.Equal(5, rows[0].Score);
        Assert.Equal("changed my mind", rows[0].Comment);
    }

    // ---- Lifecycle ----

    [Fact]
    public async Task Close_then_reopen_restores_live_and_unarchives()
    {
        using var db = NewDb();
        var m = Member();
        db.TeamMembers.Add(m);
        var s = Session(m.Id, status: "live");
        s.StartedAt = DateTimeOffset.UtcNow;               // reopen should return to live, not draft
        db.RetroBoardSessions.Add(s);
        await db.SaveChangesAsync();
        var svc = Svc(db);

        var closed = await svc.CloseAsync(s.Id, m.Id);
        Assert.Equal("closed", closed!.Status);
        Assert.NotNull(closed.ClosedAt);

        Assert.True(await svc.SetArchivedAsync(s.Id, m.Id, true));

        var reopened = await svc.ReopenAsync(s.Id, m.Id);
        Assert.Equal("live", reopened!.Status);
        Assert.Null(reopened.ClosedAt);
        Assert.False(reopened.IsArchived);
    }

    [Fact]
    public async Task Reopen_returns_to_draft_when_never_started()
    {
        using var db = NewDb();
        var m = Member();
        db.TeamMembers.Add(m);
        var s = Session(m.Id, status: "closed");           // closed but StartedAt == null
        db.RetroBoardSessions.Add(s);
        await db.SaveChangesAsync();

        var reopened = await Svc(db).ReopenAsync(s.Id, m.Id);
        Assert.Equal("draft", reopened!.Status);
    }

    // ---- Close-lock (A1) ----

    [Fact]
    public async Task Closed_session_blocks_notes_but_still_accepts_feedback()
    {
        using var db = NewDb();
        var m = Member();
        db.TeamMembers.Add(m);
        var s = Session(m.Id, status: "live");
        db.RetroBoardSessions.Add(s);
        var col = new RetroBoardColumn { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, Key = "well", Label = "Well", Color = "#fff", Icon = "star", SortOrder = 0 };
        db.RetroBoardColumns.Add(col);
        var prompt = new RetroBoardFeedbackPrompt { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, Text = "Flow" };
        db.RetroBoardFeedbackPrompts.Add(prompt);
        await db.SaveChangesAsync();
        var svc = Svc(db);

        // While live, a note can be added.
        Assert.NotNull(await svc.AddNoteAsync(s.Id, m.Id, new AddRetroBoardNoteRequest { ColumnId = col.Id, Text = "hi" }));

        await svc.CloseAsync(s.Id, m.Id);

        // Board mutation is blocked once closed…
        Assert.Null(await svc.AddNoteAsync(s.Id, m.Id, new AddRetroBoardNoteRequest { ColumnId = col.Id, Text = "nope" }));
        // …but post-retro feedback is still accepted.
        Assert.True(await svc.RespondFeedbackAsync(s.Id, m.Id, prompt.Id, 4, "still fine"));
    }
}
