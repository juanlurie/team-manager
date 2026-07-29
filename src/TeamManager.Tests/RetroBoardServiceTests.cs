using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.RetroBoard;
using TeamManager.Api.Application.Realtime;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;
using Xunit;

namespace TeamManager.Tests;

/// <summary>No-op broadcaster so the service under test needs no WebSocket transport.</summary>
internal sealed class NullRetroBroadcaster : IRetroBroadcaster
{
    public void ToSession(Guid sessionId, string type, object? data = null) { }
    public void Global(string type, object data, bool guestAllowed = false) { }
}

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

    private static RetroBoardService Svc(AppDbContext db) => new(db, new AiPromptExecutorService(db), new NullRetroBroadcaster());

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

    // `phase` matters for any test that adds a note, votes or comments: the service gates each of
    // those on the step the retro is actually on (RetroBoardService.CanAddNotes/CanVote/CanComment),
    // so a test exercising votes has to put the board on "vote".
    private static RetroBoardSession Session(Guid createdBy, string status = "draft", string phase = "setup") =>
        new()
        {
            Id = Guid.NewGuid(),
            CreatedByMemberId = createdBy,
            Title = "Test Retro",
            Phase = phase,
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

        var result = await Svc(db).RespondFeedbackAsync(s.Id, m.Id, prompt.Id, score, null);
        Assert.Equal(expectedOk, result == RetroActionResult.Ok);
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

        Assert.Equal(RetroActionResult.Ok, await svc.RespondFeedbackAsync(s.Id, m.Id, prompt.Id, 3, "first"));
        Assert.Equal(RetroActionResult.Ok, await svc.RespondFeedbackAsync(s.Id, m.Id, prompt.Id, 5, "changed my mind"));

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

        var (closeResult, closed) = await svc.CloseAsync(s.Id, m.Id);
        Assert.Equal(RetroActionResult.Ok, closeResult);
        Assert.Equal("closed", closed!.Status);
        Assert.NotNull(closed.ClosedAt);

        Assert.Equal(RetroActionResult.Ok, await svc.SetArchivedAsync(s.Id, m.Id, true));

        var (reopenResult, reopened) = await svc.ReopenAsync(s.Id, m.Id);
        Assert.Equal(RetroActionResult.Ok, reopenResult);
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

        var (reopenResult, reopened) = await Svc(db).ReopenAsync(s.Id, m.Id);
        Assert.Equal(RetroActionResult.Ok, reopenResult);
        Assert.Equal("draft", reopened!.Status);
    }

    [Fact]
    public async Task Open_publishes_draft_for_precapture()
    {
        using var db = NewDb();
        var m = Member();
        db.TeamMembers.Add(m);
        var s = Session(m.Id);                              // draft, phase "setup"
        db.RetroBoardSessions.Add(s);
        await db.SaveChangesAsync();

        var (result, opened) = await Svc(db).OpenAsync(s.Id, m.Id);
        Assert.Equal(RetroActionResult.Ok, result);
        Assert.Equal("open", opened!.Status);
        Assert.Equal("capture", opened.Phase);              // pre-capture happens on the Capture board
        Assert.Null(opened.StartedAt);                      // not "started" until it goes live
    }

    [Fact]
    public async Task GoLive_starts_guided_session_at_checkin()
    {
        using var db = NewDb();
        var m = Member();
        db.TeamMembers.Add(m);
        var s = Session(m.Id, status: "open");
        s.Phase = "capture";
        db.RetroBoardSessions.Add(s);
        db.RetroBoardCheckinQuestions.Add(new RetroBoardCheckinQuestion { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, Text = "Q", SortOrder = 0 });
        await db.SaveChangesAsync();

        var (result, live) = await Svc(db).GoLiveAsync(s.Id, m.Id);
        Assert.Equal(RetroActionResult.Ok, result);
        Assert.Equal("live", live!.Status);
        Assert.Equal("checkin", live.Phase);                // starts at check-in when it has questions
        Assert.NotNull(live.StartedAt);
    }

    [Fact]
    public async Task SetSquad_enrols_team_members_idempotently()
    {
        using var db = NewDb();
        var creator = Member("Creator");
        var alice = Member("Alice");
        var bob = Member("Bob");
        db.TeamMembers.AddRange(creator, alice, bob);
        var squad = new Squad { Id = Guid.NewGuid(), Name = "Platform" };
        db.Squads.Add(squad);
        db.SquadMembers.AddRange(
            new SquadMember { Id = Guid.NewGuid(), SquadId = squad.Id, TeamMemberId = alice.Id },
            new SquadMember { Id = Guid.NewGuid(), SquadId = squad.Id, TeamMemberId = bob.Id });
        var s = Session(creator.Id);
        db.RetroBoardSessions.Add(s);
        await db.SaveChangesAsync();
        var svc = Svc(db);

        var (result, withTeam) = await svc.SetSquadAsync(s.Id, creator.Id, squad.Id);
        Assert.Equal(RetroActionResult.Ok, result);
        Assert.Equal(squad.Id, withTeam!.SquadId);
        Assert.Equal(2, withTeam.Participants.Count);       // both squad members enrolled
        Assert.Contains(withTeam.Participants, p => p.MemberId == alice.Id);
        Assert.Contains(withTeam.Participants, p => p.MemberId == bob.Id);

        // Re-applying the same team adds no duplicates.
        var (again, reapplied) = await svc.SetSquadAsync(s.Id, creator.Id, squad.Id);
        Assert.Equal(RetroActionResult.Ok, again);
        Assert.Equal(2, reapplied!.Participants.Count);
    }

    [Fact]
    public async Task HasCheckedIn_is_true_only_when_all_checkin_questions_answered()
    {
        using var db = NewDb();
        var facil = Member("Fac");
        var full = Member("Full");
        var partial = Member("Partial");
        db.TeamMembers.AddRange(facil, full, partial);
        var s = Session(facil.Id, status: "live");
        s.Phase = "checkin";
        s.Participants =
        [
            new RetroBoardParticipant { Id = Guid.NewGuid(), MemberId = full.Id, Role = "participant" },
            new RetroBoardParticipant { Id = Guid.NewGuid(), MemberId = partial.Id, Role = "participant" },
        ];
        db.RetroBoardSessions.Add(s);
        var q1 = new RetroBoardCheckinQuestion { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, Text = "Q1", SortOrder = 0 };
        var q2 = new RetroBoardCheckinQuestion { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, Text = "Q2", SortOrder = 1 };
        db.RetroBoardCheckinQuestions.AddRange(q1, q2);
        db.RetroBoardCheckinResponses.AddRange(
            new RetroBoardCheckinResponse { Id = Guid.NewGuid(), RetroBoardCheckinQuestionId = q1.Id, MemberId = full.Id, Rating = "better" },
            new RetroBoardCheckinResponse { Id = Guid.NewGuid(), RetroBoardCheckinQuestionId = q2.Id, MemberId = full.Id, Rating = "same" },
            new RetroBoardCheckinResponse { Id = Guid.NewGuid(), RetroBoardCheckinQuestionId = q1.Id, MemberId = partial.Id, Rating = "worse" });   // only 1 of 2
        await db.SaveChangesAsync();

        var dto = (await Svc(db).GetSessionAsync(s.Id, facil.Id))!;
        Assert.True(dto.Participants.Single(p => p.MemberId == full.Id).Responded["checkin"]);
        Assert.False(dto.Participants.Single(p => p.MemberId == partial.Id).Responded["checkin"]);
    }

    [Fact]
    public async Task Guest_participant_maps_with_display_name_and_no_member()
    {
        using var db = NewDb();
        var facil = Member("Fac");
        db.TeamMembers.Add(facil);
        var s = Session(facil.Id, status: "live");
        s.AllowGuestJoin = true;
        var memberPart = new RetroBoardParticipant { Id = Guid.NewGuid(), MemberId = facil.Id, Role = "facilitator" };
        var guestPart = new RetroBoardParticipant { Id = Guid.NewGuid(), MemberId = null, DisplayName = "Guest Gilbert", GuestSessionId = "tok-123", Role = "participant" };
        s.Participants = [memberPart, guestPart];
        db.RetroBoardSessions.Add(s);
        await db.SaveChangesAsync();

        var dto = (await Svc(db).GetSessionAsync(s.Id, facil.Id))!;
        Assert.True(dto.AllowGuestJoin);

        var guest = dto.Participants.Single(p => p.Id == guestPart.Id);
        Assert.Null(guest.MemberId);
        Assert.True(guest.IsGuest);
        Assert.Equal("Guest Gilbert", guest.Name);              // name comes from DisplayName, not a member profile
        Assert.All(guest.Responded.Values, Assert.False);       // no member-keyed contributions

        var member = dto.Participants.Single(p => p.Id == memberPart.Id);
        Assert.False(member.IsGuest);
        Assert.Equal(facil.Id, member.MemberId);
    }

    [Fact]
    public async Task HasCaptured_and_HasVoted_reflect_named_contributions_only()
    {
        using var db = NewDb();
        var facil = Member("Fac");
        var doer = Member("Doer");
        var lurker = Member("Lurker");
        db.TeamMembers.AddRange(facil, doer, lurker);
        var s = Session(facil.Id, status: "live");
        s.Participants =
        [
            new RetroBoardParticipant { Id = Guid.NewGuid(), MemberId = doer.Id, Role = "participant" },
            new RetroBoardParticipant { Id = Guid.NewGuid(), MemberId = lurker.Id, Role = "participant" },
        ];
        db.RetroBoardSessions.Add(s);
        var col = new RetroBoardColumn { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, Key = "well", Label = "Well", Color = "#fff", Icon = "star", SortOrder = 0 };
        db.RetroBoardColumns.Add(col);
        var named = new RetroBoardNote { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, RetroBoardColumnId = col.Id, AuthorMemberId = doer.Id, Text = "mine" };
        var anon = new RetroBoardNote { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, RetroBoardColumnId = col.Id, AuthorMemberId = null, IsAnonymous = true, Text = "anon" };
        db.RetroBoardNotes.AddRange(named, anon);
        db.RetroBoardVotes.Add(new RetroBoardVote { Id = Guid.NewGuid(), RetroBoardNoteId = named.Id, MemberId = doer.Id });
        await db.SaveChangesAsync();

        var dto = (await Svc(db).GetSessionAsync(s.Id, facil.Id))!;
        var pDoer = dto.Participants.Single(p => p.MemberId == doer.Id);
        var pLurker = dto.Participants.Single(p => p.MemberId == lurker.Id);
        Assert.True(pDoer.Responded["capture"]);
        Assert.True(pDoer.Responded["vote"]);
        Assert.False(pLurker.Responded["capture"]);   // anonymous note can't be attributed to anyone
        Assert.False(pLurker.Responded["vote"]);
    }

    [Fact]
    public async Task HasGivenFeedback_is_true_only_when_all_prompts_rated()
    {
        using var db = NewDb();
        var facil = Member("Fac");
        var rater = Member("Rater");
        var quiet = Member("Quiet");
        db.TeamMembers.AddRange(facil, rater, quiet);
        var s = Session(facil.Id, status: "live");
        s.Participants =
        [
            new RetroBoardParticipant { Id = Guid.NewGuid(), MemberId = rater.Id, Role = "participant" },
            new RetroBoardParticipant { Id = Guid.NewGuid(), MemberId = quiet.Id, Role = "participant" },
        ];
        db.RetroBoardSessions.Add(s);
        var p1 = new RetroBoardFeedbackPrompt { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, Text = "A", SortOrder = 0 };
        var p2 = new RetroBoardFeedbackPrompt { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, Text = "B", SortOrder = 1 };
        db.RetroBoardFeedbackPrompts.AddRange(p1, p2);
        db.RetroBoardFeedbackResponses.AddRange(
            new RetroBoardFeedbackResponse { Id = Guid.NewGuid(), RetroBoardFeedbackPromptId = p1.Id, MemberId = rater.Id, Score = 5 },
            new RetroBoardFeedbackResponse { Id = Guid.NewGuid(), RetroBoardFeedbackPromptId = p2.Id, MemberId = rater.Id, Score = 4 },
            new RetroBoardFeedbackResponse { Id = Guid.NewGuid(), RetroBoardFeedbackPromptId = p1.Id, MemberId = quiet.Id, Score = 3 });   // only 1 of 2
        await db.SaveChangesAsync();

        var dto = (await Svc(db).GetSessionAsync(s.Id, facil.Id))!;
        Assert.True(dto.Participants.Single(p => p.MemberId == rater.Id).Responded["reflect"]);
        Assert.False(dto.Participants.Single(p => p.MemberId == quiet.Id).Responded["reflect"]);
    }

    // ---- Session structure (phase config) ----

    [Fact]
    public async Task EnabledPhases_auto_skips_empty_checkin_and_reflect()
    {
        using var db = NewDb();
        var m = Member();
        db.TeamMembers.Add(m);
        var s = Session(m.Id, status: "live");
        s.Phase = "capture";
        db.RetroBoardSessions.Add(s);                       // no check-in questions, no feedback prompts
        await db.SaveChangesAsync();

        var dto = (await Svc(db).GetSessionAsync(s.Id, m.Id))!;
        Assert.DoesNotContain("checkin", dto.EnabledPhases);
        Assert.DoesNotContain("reflect", dto.EnabledPhases);
        Assert.Contains("capture", dto.EnabledPhases);
        Assert.Contains("discuss", dto.EnabledPhases);
        Assert.Contains("summary", dto.EnabledPhases);
    }

    [Fact]
    public async Task EnabledPhases_honours_a_disabled_toggle_even_with_content()
    {
        using var db = NewDb();
        var m = Member();
        db.TeamMembers.Add(m);
        var s = Session(m.Id, status: "live");
        s.PhaseConfigJson = "{\"checkin\":{\"enabled\":false,\"enforced\":true,\"timed\":true}}";
        db.RetroBoardSessions.Add(s);
        db.RetroBoardCheckinQuestions.Add(new RetroBoardCheckinQuestion { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, Text = "Q", SortOrder = 0 });
        db.RetroBoardFeedbackPrompts.Add(new RetroBoardFeedbackPrompt { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, Text = "P", SortOrder = 0 });
        await db.SaveChangesAsync();

        var dto = (await Svc(db).GetSessionAsync(s.Id, m.Id))!;
        Assert.DoesNotContain("checkin", dto.EnabledPhases);   // toggled off despite having a question
        Assert.Contains("reflect", dto.EnabledPhases);         // enabled and has a prompt
    }

    [Fact]
    public async Task GoLive_starts_at_capture_when_checkin_is_skipped()
    {
        using var db = NewDb();
        var m = Member();
        db.TeamMembers.Add(m);
        var s = Session(m.Id, status: "open");             // no check-in questions → checkin auto-skips
        db.RetroBoardSessions.Add(s);
        await db.SaveChangesAsync();

        var (result, live) = await Svc(db).GoLiveAsync(s.Id, m.Id);
        Assert.Equal(RetroActionResult.Ok, result);
        Assert.Equal("capture", live!.Phase);

        // With a question present, GoLive starts at check-in.
        var s2 = Session(m.Id, status: "open");
        db.RetroBoardSessions.Add(s2);
        db.RetroBoardCheckinQuestions.Add(new RetroBoardCheckinQuestion { Id = Guid.NewGuid(), RetroBoardSessionId = s2.Id, Text = "Q", SortOrder = 0 });
        await db.SaveChangesAsync();
        var (_, live2) = await Svc(db).GoLiveAsync(s2.Id, m.Id);
        Assert.Equal("checkin", live2!.Phase);
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
        var (liveResult, liveSnapshot, _) = await svc.AddNoteAsync(s.Id, m.Id, new AddRetroBoardNoteRequest { ColumnId = col.Id, Text = "hi" });
        Assert.Equal(RetroActionResult.Ok, liveResult);
        Assert.NotNull(liveSnapshot);

        await svc.CloseAsync(s.Id, m.Id);

        // Board mutation is blocked once closed…
        var (closedResult, _, _) = await svc.AddNoteAsync(s.Id, m.Id, new AddRetroBoardNoteRequest { ColumnId = col.Id, Text = "nope" });
        Assert.Equal(RetroActionResult.Closed, closedResult);
        // …but post-retro feedback is still accepted.
        Assert.Equal(RetroActionResult.Ok, await svc.RespondFeedbackAsync(s.Id, m.Id, prompt.Id, 4, "still fine"));
    }

    // ---- Membership gating (A4) ----

    [Fact]
    public async Task Non_participant_cannot_add_notes_or_submit_feedback()
    {
        using var db = NewDb();
        var creator = Member("Creator");
        var outsider = Member("Outsider");          // a colleague who never joined this retro
        db.TeamMembers.AddRange(creator, outsider);
        var s = Session(creator.Id, status: "live");
        db.RetroBoardSessions.Add(s);
        var col = new RetroBoardColumn { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, Key = "well", Label = "Well", Color = "#fff", Icon = "star", SortOrder = 0 };
        db.RetroBoardColumns.Add(col);
        var prompt = new RetroBoardFeedbackPrompt { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, Text = "Flow" };
        db.RetroBoardFeedbackPrompts.Add(prompt);
        await db.SaveChangesAsync();
        var svc = Svc(db);

        var (noteResult, _, _) = await svc.AddNoteAsync(s.Id, outsider.Id, new AddRetroBoardNoteRequest { ColumnId = col.Id, Text = "sneaky" });
        Assert.Equal(RetroActionResult.Forbidden, noteResult);
        // The aggregate must not be poisonable by a non-participant.
        Assert.Equal(RetroActionResult.Forbidden, await svc.RespondFeedbackAsync(s.Id, outsider.Id, prompt.Id, 1, "drive-by"));
    }

    [Fact]
    public async Task Participant_cannot_perform_facilitator_actions()
    {
        using var db = NewDb();
        var creator = Member("Creator");
        var participant = Member("Part");
        db.TeamMembers.AddRange(creator, participant);
        var s = Session(creator.Id, status: "live");
        s.Participants = [new RetroBoardParticipant { Id = Guid.NewGuid(), MemberId = participant.Id, Role = "participant" }];
        db.RetroBoardSessions.Add(s);
        await db.SaveChangesAsync();
        var svc = Svc(db);

        var (asParticipant, _) = await svc.AddColumnAsync(s.Id, participant.Id, new RetroColumnInput { Label = "Nope", Color = "#fff", Icon = "star" });
        Assert.Equal(RetroActionResult.Forbidden, asParticipant);

        var (asFacilitator, col) = await svc.AddColumnAsync(s.Id, creator.Id, new RetroColumnInput { Label = "Yes", Color = "#fff", Icon = "star" });
        Assert.Equal(RetroActionResult.Ok, asFacilitator);
        Assert.NotNull(col);
    }

    // ---- Vote budget caps ----

    [Fact]
    public async Task Vote_enforces_total_budget_and_three_per_topic()
    {
        using var db = NewDb();
        var m = Member();
        db.TeamMembers.Add(m);
        var s = Session(m.Id, status: "live", phase: "vote");
        s.VotesPerUser = 4;
        db.RetroBoardSessions.Add(s);
        var col = new RetroBoardColumn { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, Key = "well", Label = "Well", Color = "#fff", Icon = "star", SortOrder = 0 };
        db.RetroBoardColumns.Add(col);
        var noteA = new RetroBoardNote { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, RetroBoardColumnId = col.Id, Text = "A" };
        var noteB = new RetroBoardNote { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, RetroBoardColumnId = col.Id, Text = "B" };
        db.RetroBoardNotes.AddRange(noteA, noteB);
        await db.SaveChangesAsync();
        var svc = Svc(db);

        // Max 3 on a single topic — the 4th on the same note is rejected even though budget remains.
        for (var i = 0; i < 3; i++) Assert.Equal(RetroActionResult.Ok, (await svc.AddVoteAsync(s.Id, m.Id, noteA.Id)).result);
        var (perTopic, perTopicErr) = await svc.AddVoteAsync(s.Id, m.Id, noteA.Id);
        Assert.Equal(RetroActionResult.Conflict, perTopic);
        Assert.Equal("Max 3 votes per topic.", perTopicErr);

        // A 4th vote (on note B) exhausts the budget of 4; the 5th is rejected.
        Assert.Equal(RetroActionResult.Ok, (await svc.AddVoteAsync(s.Id, m.Id, noteB.Id)).result);
        var (budget, budgetErr) = await svc.AddVoteAsync(s.Id, m.Id, noteB.Id);
        Assert.Equal(RetroActionResult.Conflict, budget);
        Assert.Equal("No votes left.", budgetErr);
    }

    // ---- Note masking (hide-until-reveal) ----

    [Fact]
    public async Task Capture_masks_others_notes_until_reveal()
    {
        using var db = NewDb();
        var facil = Member("Fac");
        var author = Member("Author");
        var other = Member("Other");
        db.TeamMembers.AddRange(facil, author, other);
        var s = Session(facil.Id, status: "live");
        s.Phase = "capture";
        s.HideNotesUntilReveal = true;
        s.NotesRevealed = false;
        db.RetroBoardSessions.Add(s);
        var col = new RetroBoardColumn { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, Key = "well", Label = "Well", Color = "#fff", Icon = "star", SortOrder = 0 };
        db.RetroBoardColumns.Add(col);
        db.RetroBoardNotes.Add(new RetroBoardNote { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, RetroBoardColumnId = col.Id, AuthorMemberId = author.Id, Text = "secret" });
        await db.SaveChangesAsync();
        var svc = Svc(db);

        // Another participant sees the note masked…
        Assert.Null((await svc.GetSessionAsync(s.Id, other.Id))!.Notes.Single().Text);
        // …the author sees their own…
        Assert.Equal("secret", (await svc.GetSessionAsync(s.Id, author.Id))!.Notes.Single().Text);
        // …and the facilitator sees through the mask.
        Assert.Equal("secret", (await svc.GetSessionAsync(s.Id, facil.Id))!.Notes.Single().Text);

        // After the global reveal, everyone sees it.
        await svc.RevealNotesAsync(s.Id, facil.Id);
        Assert.Equal("secret", (await svc.GetSessionAsync(s.Id, other.Id))!.Notes.Single().Text);
    }

    // ---- Guest join (slice 2a) ----

    // Defaults to the Capture phase, since most guest tests contribute notes; vote tests pass "vote".
    private static RetroBoardSession GuestBoard(Guid createdBy, bool allowGuest = true, string status = "live", string phase = "capture")
    {
        var s = Session(createdBy, status, phase);
        s.Slug = "quiet-lobster";
        s.AllowGuestJoin = allowGuest;
        return s;
    }

    [Fact]
    public async Task Guest_can_join_an_allowed_board_and_becomes_a_guest_participant()
    {
        using var db = NewDb();
        var facil = Member("Fac");
        db.TeamMembers.Add(facil);
        db.RetroBoardSessions.Add(GuestBoard(facil.Id));
        await db.SaveChangesAsync();

        var (result, board) = await Svc(db).JoinGuestAsync("quiet-lobster", "guest-tok-1", "  Gilbert  ");

        Assert.Equal(RetroActionResult.Ok, result);
        Assert.True(board!.HasJoined);
        Assert.Equal("Gilbert", board.DisplayName);                          // trimmed
        var guest = board.Board.Participants.Single(p => p.IsGuest);
        Assert.Null(guest.MemberId);
        Assert.Equal("Gilbert", guest.Name);
        Assert.False(board.Board.IsFacilitator);                             // a guest is never a facilitator
    }

    [Fact]
    public async Task Guest_rejoin_with_the_same_token_updates_instead_of_duplicating()
    {
        using var db = NewDb();
        var facil = Member("Fac");
        db.TeamMembers.Add(facil);
        db.RetroBoardSessions.Add(GuestBoard(facil.Id));
        await db.SaveChangesAsync();
        var svc = Svc(db);

        await svc.JoinGuestAsync("quiet-lobster", "guest-tok-1", "Gilbert");
        var (result, board) = await svc.JoinGuestAsync("quiet-lobster", "guest-tok-1", "Gil");

        Assert.Equal(RetroActionResult.Ok, result);
        Assert.Single(board!.Board.Participants.Where(p => p.IsGuest));      // not duplicated
        Assert.Equal("Gil", board.DisplayName);                             // name updated on rejoin
    }

    [Fact]
    public async Task Guest_join_is_rejected_when_guest_join_is_disabled()
    {
        using var db = NewDb();
        var facil = Member("Fac");
        db.TeamMembers.Add(facil);
        db.RetroBoardSessions.Add(GuestBoard(facil.Id, allowGuest: false));
        await db.SaveChangesAsync();

        var (result, board) = await Svc(db).JoinGuestAsync("quiet-lobster", "guest-tok-1", "Gilbert");

        Assert.Equal(RetroActionResult.NotFound, result);                   // no enumeration signal
        Assert.Null(board);
        Assert.Null(await Svc(db).GetGuestBoardAsync("quiet-lobster", "guest-tok-1"));
    }

    [Fact]
    public async Task Guest_join_requires_a_display_name()
    {
        using var db = NewDb();
        var facil = Member("Fac");
        db.TeamMembers.Add(facil);
        db.RetroBoardSessions.Add(GuestBoard(facil.Id));
        await db.SaveChangesAsync();

        var (result, _) = await Svc(db).JoinGuestAsync("quiet-lobster", "guest-tok-1", "   ");
        Assert.Equal(RetroActionResult.Invalid, result);
    }

    [Fact]
    public async Task Guest_cannot_join_a_closed_board()
    {
        using var db = NewDb();
        var facil = Member("Fac");
        db.TeamMembers.Add(facil);
        db.RetroBoardSessions.Add(GuestBoard(facil.Id, status: "closed"));
        await db.SaveChangesAsync();

        var (result, _) = await Svc(db).JoinGuestAsync("quiet-lobster", "guest-tok-1", "Gilbert");
        Assert.Equal(RetroActionResult.Closed, result);
    }

    // ---- Guest content: notes + votes (slice 2b) ----

    private static RetroBoardColumn GuestCol(Guid sessionId) =>
        new() { Id = Guid.NewGuid(), RetroBoardSessionId = sessionId, Key = "well", Label = "Well", Color = "#fff", Icon = "star", SortOrder = 0 };

    [Fact]
    public async Task Guest_note_is_attributed_to_the_guest_for_everyone()
    {
        using var db = NewDb();
        var facil = Member("Fac");
        db.TeamMembers.Add(facil);
        var s = GuestBoard(facil.Id);
        db.RetroBoardSessions.Add(s);
        var col = GuestCol(s.Id);
        db.RetroBoardColumns.Add(col);
        await db.SaveChangesAsync();
        var svc = Svc(db);
        await svc.JoinGuestAsync("quiet-lobster", "g1", "Gilbert");

        var (res, board, _) = await svc.AddGuestNoteAsync("quiet-lobster", "g1",
            new AddRetroBoardNoteRequest { ColumnId = col.Id, Text = "  guest idea  " });

        Assert.Equal(RetroActionResult.Ok, res);
        var mine = board!.Board.Notes.Single();
        Assert.True(mine.IsOwn);                                  // the author guest sees it as their own
        Assert.Equal("guest idea", mine.Text);
        Assert.Equal("Gilbert", mine.AuthorName);                // attributed to the display name

        // A member sees the same guest attribution, and it isn't their own.
        var memberView = (await svc.GetSessionAsync(s.Id, facil.Id))!.Notes.Single();
        Assert.Equal("Gilbert", memberView.AuthorName);
        Assert.Null(memberView.AuthorId);                        // no member id for a guest note
        Assert.False(memberView.IsOwn);
    }

    [Fact]
    public async Task Guest_must_join_before_contributing()
    {
        using var db = NewDb();
        var facil = Member("Fac");
        db.TeamMembers.Add(facil);
        var s = GuestBoard(facil.Id);
        db.RetroBoardSessions.Add(s);
        var col = GuestCol(s.Id);
        db.RetroBoardColumns.Add(col);
        await db.SaveChangesAsync();

        var (res, _, _) = await Svc(db).AddGuestNoteAsync("quiet-lobster", "never-joined",
            new AddRetroBoardNoteRequest { ColumnId = col.Id, Text = "x" });
        Assert.Equal(RetroActionResult.Forbidden, res);
    }

    [Fact]
    public async Task Guest_votes_are_capped_at_three_per_note()
    {
        using var db = NewDb();
        var facil = Member("Fac");
        db.TeamMembers.Add(facil);
        var s = GuestBoard(facil.Id, phase: "vote");
        db.RetroBoardSessions.Add(s);
        var col = GuestCol(s.Id);
        db.RetroBoardColumns.Add(col);
        var note = new RetroBoardNote { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, RetroBoardColumnId = col.Id, AuthorMemberId = facil.Id, Text = "topic" };
        db.RetroBoardNotes.Add(note);
        await db.SaveChangesAsync();
        var svc = Svc(db);
        await svc.JoinGuestAsync("quiet-lobster", "g1", "Gilbert");

        for (var i = 0; i < 3; i++)
            Assert.Equal(RetroActionResult.Ok, (await svc.AddGuestVoteAsync("quiet-lobster", "g1", note.Id)).result);
        var (result, error) = await svc.AddGuestVoteAsync("quiet-lobster", "g1", note.Id);
        Assert.Equal(RetroActionResult.Conflict, result);
        Assert.Equal("Max 3 votes per topic.", error);

        // The guest sees their three votes reflected as "mine".
        var board = (await svc.GetGuestBoardAsync("quiet-lobster", "g1"))!;
        Assert.Equal(3, board.Board.Notes.Single().MyVoteCount);
    }

    [Fact]
    public async Task Guest_can_delete_only_their_own_note()
    {
        using var db = NewDb();
        var facil = Member("Fac");
        db.TeamMembers.Add(facil);
        var s = GuestBoard(facil.Id);
        db.RetroBoardSessions.Add(s);
        var col = GuestCol(s.Id);
        db.RetroBoardColumns.Add(col);
        await db.SaveChangesAsync();
        var svc = Svc(db);
        await svc.JoinGuestAsync("quiet-lobster", "g1", "Gilbert");
        await svc.JoinGuestAsync("quiet-lobster", "g2", "Grace");
        var (_, board, _) = await svc.AddGuestNoteAsync("quiet-lobster", "g1", new AddRetroBoardNoteRequest { ColumnId = col.Id, Text = "g1 note" });
        var noteId = board!.Board.Notes.Single().Id;

        Assert.Equal(RetroActionResult.Forbidden, (await svc.DeleteGuestNoteAsync("quiet-lobster", "g2", noteId)).result);
        Assert.Equal(RetroActionResult.Ok, (await svc.DeleteGuestNoteAsync("quiet-lobster", "g1", noteId)).result);
        Assert.Empty((await svc.GetGuestBoardAsync("quiet-lobster", "g1"))!.Board.Notes);
    }

    // ---- Guest reflect (feedback ratings) ----

    [Fact]
    public async Task Guest_can_rate_a_prompt_seeing_only_their_own_response_while_the_aggregate_stays_facilitator_only()
    {
        using var db = NewDb();
        var facil = Member("Fac");
        db.TeamMembers.Add(facil);
        var s = GuestBoard(facil.Id);
        db.RetroBoardSessions.Add(s);
        var prompt = new RetroBoardFeedbackPrompt { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, Text = "Flow", SortOrder = 0 };
        db.RetroBoardFeedbackPrompts.Add(prompt);
        await db.SaveChangesAsync();
        var svc = Svc(db);
        await svc.JoinGuestAsync("quiet-lobster", "g1", "Gilbert");

        Assert.Equal(RetroActionResult.Ok, await svc.RespondGuestFeedbackAsync("quiet-lobster", "g1", prompt.Id, 4, "  solid  "));

        // The guest sees their own rating (comment trimmed) but never the anonymous aggregate.
        var mine = (await svc.GetGuestBoardAsync("quiet-lobster", "g1"))!.Board.FeedbackPrompts.Single();
        Assert.Equal(4, mine.MyScore);
        Assert.Equal("solid", mine.MyComment);
        Assert.Equal(0, mine.ResponseCount);
        Assert.Null(mine.AverageScore);

        // The facilitator's aggregate includes the guest's rating.
        var agg = (await svc.GetSessionAsync(s.Id, facil.Id))!.FeedbackPrompts.Single();
        Assert.Equal(1, agg.ResponseCount);
        Assert.Equal(4, agg.AverageScore);
    }

    [Fact]
    public async Task Guest_rating_upserts_and_validates_the_score()
    {
        using var db = NewDb();
        var facil = Member("Fac");
        db.TeamMembers.Add(facil);
        var s = GuestBoard(facil.Id);
        db.RetroBoardSessions.Add(s);
        var prompt = new RetroBoardFeedbackPrompt { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, Text = "Flow", SortOrder = 0 };
        db.RetroBoardFeedbackPrompts.Add(prompt);
        await db.SaveChangesAsync();
        var svc = Svc(db);
        await svc.JoinGuestAsync("quiet-lobster", "g1", "Gilbert");

        Assert.Equal(RetroActionResult.Invalid, await svc.RespondGuestFeedbackAsync("quiet-lobster", "g1", prompt.Id, 0, null));
        await svc.RespondGuestFeedbackAsync("quiet-lobster", "g1", prompt.Id, 2, null);
        await svc.RespondGuestFeedbackAsync("quiet-lobster", "g1", prompt.Id, 5, "changed my mind");

        // One row per guest per prompt — the second call updated the first, it didn't add another.
        Assert.Single(db.RetroBoardFeedbackResponses);
        var mine = (await svc.GetGuestBoardAsync("quiet-lobster", "g1"))!.Board.FeedbackPrompts.Single();
        Assert.Equal(5, mine.MyScore);
        Assert.Equal("changed my mind", mine.MyComment);
    }

    [Fact]
    public async Task Guest_reflection_is_accepted_after_the_retro_closes_unlike_notes()
    {
        using var db = NewDb();
        var facil = Member("Fac");
        db.TeamMembers.Add(facil);
        var s = GuestBoard(facil.Id, status: "closed");
        db.RetroBoardSessions.Add(s);
        var prompt = new RetroBoardFeedbackPrompt { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, Text = "Flow", SortOrder = 0 };
        db.RetroBoardFeedbackPrompts.Add(prompt);
        var col = GuestCol(s.Id);
        db.RetroBoardColumns.Add(col);
        // The guest joined while the retro was open; their participant row persists past close.
        db.RetroBoardParticipants.Add(new RetroBoardParticipant { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, GuestSessionId = "g1", DisplayName = "Gilbert" });
        await db.SaveChangesAsync();
        var svc = Svc(db);

        // Board contributions are locked on a closed retro…
        Assert.Equal(RetroActionResult.Closed,
            (await svc.AddGuestNoteAsync("quiet-lobster", "g1", new AddRetroBoardNoteRequest { ColumnId = col.Id, Text = "x" })).result);
        // …but reflection is exempt from the close-lock, mirroring members'.
        Assert.Equal(RetroActionResult.Ok, await svc.RespondGuestFeedbackAsync("quiet-lobster", "g1", prompt.Id, 5, null));
    }

    [Fact]
    public async Task Guest_must_join_before_reflecting()
    {
        using var db = NewDb();
        var facil = Member("Fac");
        db.TeamMembers.Add(facil);
        var s = GuestBoard(facil.Id);
        db.RetroBoardSessions.Add(s);
        var prompt = new RetroBoardFeedbackPrompt { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, Text = "Flow", SortOrder = 0 };
        db.RetroBoardFeedbackPrompts.Add(prompt);
        await db.SaveChangesAsync();

        Assert.Equal(RetroActionResult.Forbidden,
            await Svc(db).RespondGuestFeedbackAsync("quiet-lobster", "never-joined", prompt.Id, 4, null));
    }

    [Fact]
    public async Task Guest_reflection_counts_toward_the_facilitators_responded_meter()
    {
        using var db = NewDb();
        var facil = Member("Fac");
        db.TeamMembers.Add(facil);
        var s = GuestBoard(facil.Id);
        db.RetroBoardSessions.Add(s);
        var prompt = new RetroBoardFeedbackPrompt { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, Text = "Flow", SortOrder = 0 };
        db.RetroBoardFeedbackPrompts.Add(prompt);
        await db.SaveChangesAsync();
        var svc = Svc(db);
        await svc.JoinGuestAsync("quiet-lobster", "g1", "Gilbert");

        // Before rating, the guest is in the roster but not yet counted as having reflected.
        var before = (await svc.GetSessionAsync(s.Id, facil.Id))!.Participants.Single(p => p.IsGuest);
        Assert.False(before.Responded["reflect"]);

        await svc.RespondGuestFeedbackAsync("quiet-lobster", "g1", prompt.Id, 5, null);

        // Once they've rated every prompt, the facilitator's meter counts them like any member.
        var after = (await svc.GetSessionAsync(s.Id, facil.Id))!.Participants.Single(p => p.IsGuest);
        Assert.True(after.Responded["reflect"]);
    }

    // ---- Phase gating ----
    // The step the retro is on decides what anyone may contribute. Enforced here, not just in the
    // UI, because both boards refetch asynchronously: a stale tab or a direct API call would sail
    // past a hidden button. Facilitators are exempt for notes/comments (host housekeeping) but never
    // for votes, since an out-of-phase vote skews the tally the team is reading.

    /// <summary>A live board on <paramref name="phase"/> with one column, one facilitator-authored
    /// note, and both members enrolled — `facil` as the creator/facilitator, `part` as an ordinary
    /// participant. Notes are pre-revealed so hide-until-reveal masking (covered separately) doesn't
    /// confound tests about the phase gates.</summary>
    private static async Task<(RetroBoardService svc, RetroBoardSession s, RetroBoardColumn col, RetroBoardNote note, TeamMember facil, TeamMember part)>
        LivePhaseBoard(AppDbContext db, string phase)
    {
        var facil = Member("Fac");
        var part = Member("Par");
        db.TeamMembers.AddRange(facil, part);
        var s = Session(facil.Id, status: "live", phase: phase);
        s.NotesRevealed = true;
        db.RetroBoardSessions.Add(s);
        var col = new RetroBoardColumn { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, Key = "well", Label = "Well", Color = "#fff", Icon = "star", SortOrder = 0 };
        db.RetroBoardColumns.Add(col);
        var note = new RetroBoardNote { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, RetroBoardColumnId = col.Id, AuthorMemberId = facil.Id, Text = "topic" };
        db.RetroBoardNotes.Add(note);
        await db.SaveChangesAsync();
        var svc = Svc(db);
        // The creator is a facilitator with or without a row; enrol them anyway so tests that need to
        // address them as a participant (removal) have one.
        await svc.JoinAsync(s.Id, facil.Id);
        await svc.JoinAsync(s.Id, part.Id);
        return (svc, s, col, note, facil, part);
    }

    [Theory]
    [InlineData("capture", RetroActionResult.Ok)]
    [InlineData("checkin", RetroActionResult.Conflict)]
    [InlineData("introduce", RetroActionResult.Conflict)]
    [InlineData("vote", RetroActionResult.Conflict)]
    [InlineData("discuss", RetroActionResult.Conflict)]
    public async Task Notes_are_only_accepted_during_capture(string phase, RetroActionResult expected)
    {
        using var db = NewDb();
        var (svc, s, col, _, _, part) = await LivePhaseBoard(db, phase);

        var (result, _, _) = await svc.AddNoteAsync(s.Id, part.Id, new AddRetroBoardNoteRequest { ColumnId = col.Id, Text = "late idea" });
        Assert.Equal(expected, result);
    }

    [Fact]
    public async Task Facilitator_may_still_capture_a_note_mid_discussion()
    {
        using var db = NewDb();
        var (svc, s, col, _, facil, _) = await LivePhaseBoard(db, "discuss");

        var (result, _, _) = await svc.AddNoteAsync(s.Id, facil.Id, new AddRetroBoardNoteRequest { ColumnId = col.Id, Text = "just said out loud" });
        Assert.Equal(RetroActionResult.Ok, result);
    }

    [Theory]
    [InlineData("vote", RetroActionResult.Ok)]
    [InlineData("capture", RetroActionResult.Conflict)]
    [InlineData("introduce", RetroActionResult.Conflict)]
    [InlineData("discuss", RetroActionResult.Conflict)]
    public async Task Votes_are_only_accepted_during_the_vote_phase(string phase, RetroActionResult expected)
    {
        using var db = NewDb();
        var (svc, s, _, note, _, part) = await LivePhaseBoard(db, phase);

        var (result, _) = await svc.AddVoteAsync(s.Id, part.Id, note.Id);
        Assert.Equal(expected, result);
    }

    [Fact]
    public async Task Facilitator_gets_no_exemption_from_the_vote_phase_gate()
    {
        using var db = NewDb();
        var (svc, s, _, note, facil, _) = await LivePhaseBoard(db, "discuss");

        var (result, error) = await svc.AddVoteAsync(s.Id, facil.Id, note.Id);
        Assert.Equal(RetroActionResult.Conflict, result);
        Assert.Equal("Voting is only open during the Vote step.", error);
    }

    // The reported bug: during Discuss a guest could still add notes and cast votes.
    [Theory]
    [InlineData("discuss")]
    [InlineData("introduce")]
    public async Task Guest_cannot_add_notes_or_vote_once_capture_and_voting_have_passed(string phase)
    {
        using var db = NewDb();
        var facil = Member("Fac");
        db.TeamMembers.Add(facil);
        var s = GuestBoard(facil.Id, phase: phase);
        db.RetroBoardSessions.Add(s);
        var col = GuestCol(s.Id);
        db.RetroBoardColumns.Add(col);
        var note = new RetroBoardNote { Id = Guid.NewGuid(), RetroBoardSessionId = s.Id, RetroBoardColumnId = col.Id, AuthorMemberId = facil.Id, Text = "topic" };
        db.RetroBoardNotes.Add(note);
        await db.SaveChangesAsync();
        var svc = Svc(db);
        await svc.JoinGuestAsync("quiet-lobster", "g1", "Gilbert");

        var (noteResult, _, noteError) = await svc.AddGuestNoteAsync("quiet-lobster", "g1",
            new AddRetroBoardNoteRequest { ColumnId = col.Id, Text = "sneaking one in" });
        Assert.Equal(RetroActionResult.Conflict, noteResult);
        Assert.Equal("Notes can only be added during Capture.", noteError);

        var (voteResult, _) = await svc.AddGuestVoteAsync("quiet-lobster", "g1", note.Id);
        Assert.Equal(RetroActionResult.Conflict, voteResult);

        Assert.DoesNotContain((await svc.GetGuestBoardAsync("quiet-lobster", "g1"))!.Board.Notes, n => n.Text == "sneaking one in");
    }

    // ---- Note comments ----

    [Theory]
    [InlineData("capture", RetroActionResult.Ok)]
    [InlineData("introduce", RetroActionResult.Ok)]
    [InlineData("discuss", RetroActionResult.Ok)]
    [InlineData("vote", RetroActionResult.Conflict)]
    public async Task Comments_are_open_across_capture_introduce_and_discuss(string phase, RetroActionResult expected)
    {
        using var db = NewDb();
        var (svc, s, _, note, _, part) = await LivePhaseBoard(db, phase);

        var (result, _, _) = await svc.AddNoteCommentAsync(s.Id, part.Id, note.Id, "what did you mean here?");
        Assert.Equal(expected, result);
    }

    [Fact]
    public async Task Comment_is_attributed_and_visible_to_everyone_on_the_note()
    {
        using var db = NewDb();
        var (svc, s, _, note, facil, part) = await LivePhaseBoard(db, "discuss");

        var (result, created, _) = await svc.AddNoteCommentAsync(s.Id, part.Id, note.Id, "  needs context  ");
        Assert.Equal(RetroActionResult.Ok, result);
        Assert.Equal("needs context", created!.Text);          // trimmed
        Assert.True(created.IsOwn);

        // The author sees it as their own; the facilitator sees the same comment attributed to them.
        var mine = (await svc.GetSessionAsync(s.Id, part.Id))!.Notes.Single().Comments.Single();
        Assert.True(mine.IsOwn);
        Assert.Equal("Par Member", mine.AuthorName);

        var theirs = (await svc.GetSessionAsync(s.Id, facil.Id))!.Notes.Single().Comments.Single();
        Assert.False(theirs.IsOwn);
        Assert.Equal("Par Member", theirs.AuthorName);
    }

    [Fact]
    public async Task Comment_is_deletable_by_its_author_or_a_facilitator_but_nobody_else()
    {
        using var db = NewDb();
        var (svc, s, _, note, facil, part) = await LivePhaseBoard(db, "discuss");
        var other = Member("Other");
        db.TeamMembers.Add(other);
        await db.SaveChangesAsync();
        await svc.JoinAsync(s.Id, other.Id);

        var (_, mine, _) = await svc.AddNoteCommentAsync(s.Id, part.Id, note.Id, "mine");
        Assert.Equal(RetroActionResult.Forbidden, (await svc.DeleteNoteCommentAsync(s.Id, other.Id, mine!.Id)).result);
        Assert.Equal(RetroActionResult.Ok, (await svc.DeleteNoteCommentAsync(s.Id, part.Id, mine.Id)).result);

        var (_, theirs, _) = await svc.AddNoteCommentAsync(s.Id, part.Id, note.Id, "also mine");
        Assert.Equal(RetroActionResult.Ok, (await svc.DeleteNoteCommentAsync(s.Id, facil.Id, theirs!.Id)).result);   // facilitator moderates
    }

    [Fact]
    public async Task Comments_are_withheld_while_the_note_is_hidden_until_reveal()
    {
        using var db = NewDb();
        var (svc, s, col, _, facil, part) = await LivePhaseBoard(db, "capture");
        s.HideNotesUntilReveal = true;
        s.NotesRevealed = false;           // undo the helper's pre-reveal: masking is the point here
        await db.SaveChangesAsync();

        // The facilitator's seeded note carries a comment, but during Capture `part` can't see the
        // note at all — so the comment must not leak either, and they can't add one to it.
        var facilNote = (await svc.GetSessionAsync(s.Id, facil.Id))!.Notes.Single();
        await svc.AddNoteCommentAsync(s.Id, facil.Id, facilNote.Id, "host context");

        var masked = (await svc.GetSessionAsync(s.Id, part.Id))!.Notes.Single();
        Assert.Null(masked.Text);
        Assert.Empty(masked.Comments);
        Assert.Equal(RetroActionResult.Forbidden,
            (await svc.AddNoteCommentAsync(s.Id, part.Id, facilNote.Id, "prying")).result);
    }

    // ---- Participant removal ----

    [Fact]
    public async Task Removing_a_participant_revokes_their_votes_and_drops_them_from_the_roster()
    {
        using var db = NewDb();
        var (svc, s, _, note, facil, part) = await LivePhaseBoard(db, "vote");
        Assert.Equal(RetroActionResult.Ok, (await svc.AddVoteAsync(s.Id, part.Id, note.Id)).result);
        Assert.Equal(1, (await svc.GetSessionAsync(s.Id, facil.Id))!.Notes.Single().VoteCount);

        var target = (await svc.GetSessionAsync(s.Id, facil.Id))!.Participants.Single(p => p.MemberId == part.Id);
        Assert.Equal(RetroActionResult.Ok, (await svc.RemoveParticipantAsync(s.Id, facil.Id, target.Id)).result);

        var after = (await svc.GetSessionAsync(s.Id, facil.Id))!;
        Assert.DoesNotContain(after.Participants, p => p.MemberId == part.Id);      // off the roster
        Assert.Contains(after.RemovedParticipants, p => p.MemberId == part.Id);     // but re-admittable
        Assert.Equal(0, after.Notes.Single().VoteCount);                            // their vote is gone
        Assert.Single(after.Notes);                                                 // their content stays
    }

    [Fact]
    public async Task Removed_member_cannot_contribute_and_rejoining_does_not_re_enrol_them()
    {
        using var db = NewDb();
        var (svc, s, col, note, facil, part) = await LivePhaseBoard(db, "capture");
        var target = (await svc.GetSessionAsync(s.Id, facil.Id))!.Participants.Single(p => p.MemberId == part.Id);
        await svc.RemoveParticipantAsync(s.Id, facil.Id, target.Id);

        // Opening the board again must not quietly put them back in the room.
        await svc.JoinAsync(s.Id, part.Id);
        Assert.DoesNotContain((await svc.GetSessionAsync(s.Id, facil.Id))!.Participants, p => p.MemberId == part.Id);

        Assert.Equal(RetroActionResult.Forbidden,
            (await svc.AddNoteAsync(s.Id, part.Id, new AddRetroBoardNoteRequest { ColumnId = col.Id, Text = "still here" })).result);
        Assert.Equal(RetroActionResult.Forbidden, (await svc.AddNoteCommentAsync(s.Id, part.Id, note.Id, "hi")).result);
    }

    [Fact]
    public async Task Removed_guest_cannot_rejoin_with_the_same_session_cookie()
    {
        using var db = NewDb();
        var facil = Member("Fac");
        db.TeamMembers.Add(facil);
        var s = GuestBoard(facil.Id);
        db.RetroBoardSessions.Add(s);
        var col = GuestCol(s.Id);
        db.RetroBoardColumns.Add(col);
        await db.SaveChangesAsync();
        var svc = Svc(db);
        await svc.JoinGuestAsync("quiet-lobster", "g1", "Gilbert");

        var target = (await svc.GetSessionAsync(s.Id, facil.Id))!.Participants.Single(p => p.IsGuest);
        Assert.Equal(RetroActionResult.Ok, (await svc.RemoveParticipantAsync(s.Id, facil.Id, target.Id)).result);

        // Their cookie is still valid, so removal is only real if the rejoin is refused.
        Assert.Equal(RetroActionResult.Forbidden, (await svc.JoinGuestAsync("quiet-lobster", "g1", "Gilbert")).result);
        Assert.False((await svc.GetGuestBoardAsync("quiet-lobster", "g1"))!.HasJoined);
        Assert.Equal(RetroActionResult.Forbidden,
            (await svc.AddGuestNoteAsync("quiet-lobster", "g1", new AddRetroBoardNoteRequest { ColumnId = col.Id, Text = "back again" })).result);
    }

    [Fact]
    public async Task Readmitting_restores_access_but_not_the_revoked_votes()
    {
        using var db = NewDb();
        var (svc, s, _, note, facil, part) = await LivePhaseBoard(db, "vote");
        await svc.AddVoteAsync(s.Id, part.Id, note.Id);
        var target = (await svc.GetSessionAsync(s.Id, facil.Id))!.Participants.Single(p => p.MemberId == part.Id);
        await svc.RemoveParticipantAsync(s.Id, facil.Id, target.Id);

        Assert.Equal(RetroActionResult.Ok, (await svc.ReadmitParticipantAsync(s.Id, facil.Id, target.Id)).result);

        var after = (await svc.GetSessionAsync(s.Id, facil.Id))!;
        Assert.Contains(after.Participants, p => p.MemberId == part.Id);
        Assert.Empty(after.RemovedParticipants);
        Assert.Equal(0, after.Notes.Single().VoteCount);         // the revoked vote does NOT come back
        Assert.Equal(RetroActionResult.Ok, (await svc.AddVoteAsync(s.Id, part.Id, note.Id)).result);   // they can vote again
    }

    [Fact]
    public async Task Creator_and_self_cannot_be_removed_and_only_a_facilitator_may_remove()
    {
        using var db = NewDb();
        var (svc, s, _, _, facil, part) = await LivePhaseBoard(db, "vote");
        var roster = (await svc.GetSessionAsync(s.Id, facil.Id))!.Participants;
        var creatorRow = roster.Single(p => p.MemberId == facil.Id);
        var partRow = roster.Single(p => p.MemberId == part.Id);

        // The creator owns the retro — removing them would orphan it.
        Assert.Equal(RetroActionResult.Conflict, (await svc.RemoveParticipantAsync(s.Id, facil.Id, creatorRow.Id)).result);
        // An ordinary participant can't remove anyone.
        Assert.Equal(RetroActionResult.Forbidden, (await svc.RemoveParticipantAsync(s.Id, part.Id, creatorRow.Id)).result);
        // A second facilitator can't remove themselves mid-facilitation.
        await svc.SetParticipantRoleAsync(s.Id, facil.Id, part.Id, "facilitator");
        Assert.Equal(RetroActionResult.Conflict, (await svc.RemoveParticipantAsync(s.Id, part.Id, partRow.Id)).result);
    }
}
