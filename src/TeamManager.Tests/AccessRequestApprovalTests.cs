using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Squad;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;
using Xunit;

namespace TeamManager.Tests;

/// <summary>
/// Approval places a member into a squad, and the squad implies a team. What is pinned here is the
/// set of quiet failures the shape invites: a missing squad id meaning "don't assign" rather than
/// "clear their squads", assignment reaching the reactivate branch and not just the create branch,
/// a bad squad id failing the whole approval instead of half of it, and the client never getting to
/// state a team.
/// </summary>
public class AccessRequestApprovalTests
{
    private static AppDbContext NewDb() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"approval-{Guid.NewGuid()}")
            .Options);

    private static AccessRequestApprovalService Service(AppDbContext db) => new(db, new SquadService(db));

    private static AccessRequest Request(string email = "new.person@team.local", string name = "New Person") => new()
    {
        Id = Guid.NewGuid(),
        Email = email,
        Name = name,
        Reason = "Please let me in",
        Status = "Pending"
    };

    private static TeamMember Member(string email) => new()
    {
        Id = Guid.NewGuid(),
        FirstName = "Existing",
        LastName = "Member",
        Email = email,
        Role = MemberRole.Member,
        IsActive = false
    };

    private static Task<List<Guid>> SquadIdsOf(AppDbContext db, Guid memberId) =>
        db.SquadMembers.Where(sm => sm.TeamMemberId == memberId).Select(sm => sm.SquadId).ToListAsync();

    // --- Assignment on the create-new branch -----------------------------------------------

    [Fact]
    public async Task Approving_with_a_squad_creates_the_member_in_that_squad()
    {
        using var db = NewDb();
        var team = new Team { Id = Guid.NewGuid(), Name = "Alpha" };
        var squad = new Squad { Id = Guid.NewGuid(), Name = "Squad One", TeamId = team.Id };
        var request = Request();
        db.AddRange(team, squad, request);
        await db.SaveChangesAsync();

        var result = await Service(db).ApproveAsync(request.Id, Guid.NewGuid(), new ApprovalInput(SquadId: squad.Id));

        Assert.Equal(ApprovalOutcome.Success, result.Outcome);
        Assert.False(result.Reactivated);
        Assert.Equal([squad.Id], await SquadIdsOf(db, result.MemberId!.Value));
    }

    [Fact]
    public async Task Approving_without_a_squad_is_not_an_error()
    {
        using var db = NewDb();
        var request = Request();
        db.Add(request);
        await db.SaveChangesAsync();

        var result = await Service(db).ApproveAsync(request.Id, Guid.NewGuid(), new ApprovalInput());

        Assert.Equal(ApprovalOutcome.Success, result.Outcome);
        Assert.Empty(await SquadIdsOf(db, result.MemberId!.Value));
        Assert.Equal("Approved", (await db.AccessRequests.FindAsync(request.Id))!.Status);
    }

    // --- Assignment on the reactivate branch -----------------------------------------------

    [Fact]
    public async Task A_reactivated_member_gets_the_squad_too()
    {
        using var db = NewDb();
        // The payoff of the extraction: the two branches used to each end in their own save, so
        // assignment written once for "create" would simply not have happened here.
        var squad = new Squad { Id = Guid.NewGuid(), Name = "Squad One" };
        var member = Member("returning@team.local");
        var request = Request("returning@team.local");
        db.AddRange(squad, member, request);
        await db.SaveChangesAsync();

        var result = await Service(db).ApproveAsync(request.Id, Guid.NewGuid(), new ApprovalInput(SquadId: squad.Id));

        Assert.Equal(ApprovalOutcome.Success, result.Outcome);
        Assert.True(result.Reactivated);
        Assert.Equal(member.Id, result.MemberId);
        Assert.True((await db.TeamMembers.FindAsync(member.Id))!.IsActive);
        Assert.Equal([squad.Id], await SquadIdsOf(db, member.Id));
    }

    [Fact]
    public async Task Approving_without_a_squad_leaves_an_existing_members_squads_alone()
    {
        using var db = NewDb();
        // A null squad id means "the reviewer didn't assign one", never "clear their squads".
        // Calling SetMemberSquadsAsync with an empty list here would wipe the memberships below.
        var squad = new Squad { Id = Guid.NewGuid(), Name = "Squad One" };
        var member = Member("returning@team.local");
        var request = Request("returning@team.local");
        db.AddRange(squad, member, request);
        db.Add(new SquadMember { Id = Guid.NewGuid(), SquadId = squad.Id, TeamMemberId = member.Id });
        await db.SaveChangesAsync();

        await Service(db).ApproveAsync(request.Id, Guid.NewGuid(), new ApprovalInput());

        Assert.Equal([squad.Id], await SquadIdsOf(db, member.Id));
    }

    [Fact]
    public async Task Assignment_adds_to_existing_squads_rather_than_replacing_them()
    {
        using var db = NewDb();
        // Approval places someone *into* a squad; it is not a claim that this is now their only one.
        var held = new Squad { Id = Guid.NewGuid(), Name = "Held" };
        var assigned = new Squad { Id = Guid.NewGuid(), Name = "Assigned" };
        var member = Member("returning@team.local");
        var request = Request("returning@team.local");
        db.AddRange(held, assigned, member, request);
        var heldRow = new SquadMember { Id = Guid.NewGuid(), SquadId = held.Id, TeamMemberId = member.Id };
        db.Add(heldRow);
        await db.SaveChangesAsync();

        await Service(db).ApproveAsync(request.Id, Guid.NewGuid(), new ApprovalInput(SquadId: assigned.Id));

        var ids = await SquadIdsOf(db, member.Id);
        Assert.Equal(2, ids.Count);
        Assert.Contains(held.Id, ids);
        Assert.Contains(assigned.Id, ids);

        // And the membership they already had is the *same row*, not a delete-and-reinsert. Adding
        // one squad by replacing the whole set churned every row the member held, handing each a
        // fresh Id for a change that never concerned it.
        var stillHeld = await db.SquadMembers
            .SingleAsync(sm => sm.TeamMemberId == member.Id && sm.SquadId == held.Id);
        Assert.Equal(heldRow.Id, stillHeld.Id);
    }

    [Fact]
    public async Task Approving_into_a_squad_the_member_is_already_in_is_a_no_op()
    {
        using var db = NewDb();
        // The unique index on (SquadId, TeamMemberId) would otherwise make a re-approval throw.
        var squad = new Squad { Id = Guid.NewGuid(), Name = "Held" };
        var member = Member("returning@team.local");
        var request = Request("returning@team.local");
        db.AddRange(squad, member, request);
        db.Add(new SquadMember { Id = Guid.NewGuid(), SquadId = squad.Id, TeamMemberId = member.Id });
        await db.SaveChangesAsync();

        var result = await Service(db).ApproveAsync(request.Id, Guid.NewGuid(), new ApprovalInput(SquadId: squad.Id));

        Assert.Equal(ApprovalOutcome.Success, result.Outcome);
        Assert.Single(await SquadIdsOf(db, member.Id));
    }

    // --- Validation -------------------------------------------------------------------------

    [Fact]
    public async Task An_unknown_squad_fails_the_whole_approval()
    {
        using var db = NewDb();
        var request = Request();
        db.Add(request);
        await db.SaveChangesAsync();

        var result = await Service(db).ApproveAsync(request.Id, Guid.NewGuid(), new ApprovalInput(SquadId: Guid.NewGuid()));

        Assert.Equal(ApprovalOutcome.SquadNotFound, result.Outcome);
        // Nothing half-applied: no member created, and the request is still reviewable.
        Assert.Equal("Pending", (await db.AccessRequests.FindAsync(request.Id))!.Status);
        Assert.Empty(await db.TeamMembers.ToListAsync());
    }

    [Fact]
    public async Task A_request_that_is_not_pending_is_refused()
    {
        using var db = NewDb();
        var request = Request();
        request.Status = "Denied";
        db.Add(request);
        await db.SaveChangesAsync();

        var result = await Service(db).ApproveAsync(request.Id, Guid.NewGuid(), new ApprovalInput());

        Assert.Equal(ApprovalOutcome.NotPending, result.Outcome);
    }

    [Fact]
    public async Task Linking_to_a_member_that_does_not_exist_is_refused()
    {
        using var db = NewDb();
        var request = Request();
        db.Add(request);
        await db.SaveChangesAsync();

        var result = await Service(db)
            .ApproveAsync(request.Id, Guid.NewGuid(), new ApprovalInput(TeamMemberId: Guid.NewGuid()));

        Assert.Equal(ApprovalOutcome.MemberNotFound, result.Outcome);
        Assert.Equal("Pending", (await db.AccessRequests.FindAsync(request.Id))!.Status);
    }

    [Fact]
    public async Task Linking_a_member_whose_email_belongs_to_someone_else_is_refused()
    {
        using var db = NewDb();
        var linked = Member("linked@team.local");
        var owner = Member("taken@team.local");
        var request = Request("taken@team.local");
        db.AddRange(linked, owner, request);
        await db.SaveChangesAsync();

        var result = await Service(db)
            .ApproveAsync(request.Id, Guid.NewGuid(), new ApprovalInput(TeamMemberId: linked.Id));

        Assert.Equal(ApprovalOutcome.EmailTaken, result.Outcome);
        Assert.Equal("taken@team.local", result.ConflictingEmail);
    }

    // --- The team is derived, never supplied -------------------------------------------------

    [Fact]
    public void Approval_input_cannot_carry_a_team_id()
    {
        // The one place a single team is well-defined is here, via squad.TeamId -- which makes it
        // tempting to let the client state it directly. It must stay derived: a client-supplied team
        // could contradict the squad it was assigned alongside.
        Assert.DoesNotContain(
            typeof(ApprovalInput).GetProperties(),
            p => p.Name.Contains("Team", StringComparison.OrdinalIgnoreCase) && p.Name != "TeamMemberId");
    }

    [Fact]
    public async Task The_assigned_squad_carries_its_team_through_to_the_member()
    {
        using var db = NewDb();
        var team = new Team { Id = Guid.NewGuid(), Name = "Alpha" };
        var squad = new Squad { Id = Guid.NewGuid(), Name = "Squad One", TeamId = team.Id };
        var request = Request();
        db.AddRange(team, squad, request);
        await db.SaveChangesAsync();

        var result = await Service(db).ApproveAsync(request.Id, Guid.NewGuid(), new ApprovalInput(SquadId: squad.Id));

        var dto = await new TeamMemberService(db).GetByIdAsync(result.MemberId!.Value);
        Assert.Equal(["Alpha"], dto!.Teams.Select(t => t.Name));
    }

    // --- Carried into D from C: the squad write path -----------------------------------------

    [Fact]
    public async Task Creating_a_squad_with_an_unknown_team_is_a_bad_request_not_a_500()
    {
        using var db = NewDb();

        var result = await new SquadService(db)
            .CreateAsync(new CreateSquadRequest { Name = "Squad One", TeamId = Guid.NewGuid() });

        // Previously the id went straight onto the entity and surfaced from the FK as a 500 --
        // the caller's mistake reported as the server's.
        Assert.Equal(SquadSaveOutcome.TeamNotFound, result.Outcome);
        Assert.Empty(await db.Squads.ToListAsync());
    }

    [Fact]
    public async Task Moving_a_squad_to_an_unknown_team_is_refused_and_changes_nothing()
    {
        using var db = NewDb();
        var team = new Team { Id = Guid.NewGuid(), Name = "Alpha" };
        var squad = new Squad { Id = Guid.NewGuid(), Name = "Squad One", TeamId = team.Id };
        db.AddRange(team, squad);
        await db.SaveChangesAsync();

        var result = await new SquadService(db).SetTeamAsync(squad.Id, Guid.NewGuid());

        Assert.Equal(SquadSaveOutcome.TeamNotFound, result.Outcome);
        Assert.Equal(team.Id, (await db.Squads.FindAsync(squad.Id))!.TeamId);
    }

    [Fact]
    public async Task Renaming_a_squad_cannot_detach_it_from_its_team()
    {
        using var db = NewDb();
        // The trap this closes: Update shared CreateSquadRequest and wrote TeamId unconditionally,
        // so a caller posting only {name, color} silently un-teamed the squad it renamed. The field
        // is gone from the update shape, so no caller has to remember to echo it back.
        var team = new Team { Id = Guid.NewGuid(), Name = "Alpha" };
        var squad = new Squad { Id = Guid.NewGuid(), Name = "Squad One", TeamId = team.Id };
        db.AddRange(team, squad);
        await db.SaveChangesAsync();

        var result = await new SquadService(db)
            .UpdateAsync(squad.Id, new UpdateSquadRequest { Name = "Renamed", Color = "#fff" });

        Assert.Equal(SquadSaveOutcome.Success, result.Outcome);
        Assert.Equal("Renamed", result.Squad!.Name);
        Assert.Equal(team.Id, result.Squad.TeamId);
        Assert.Equal("Alpha", result.Squad.TeamName);
    }

    [Fact]
    public void The_squad_update_shape_carries_no_team_id()
    {
        // Dropping the field is what stops it coming back; asserting on the shape is what stops it
        // being quietly re-added.
        Assert.DoesNotContain(
            typeof(UpdateSquadRequest).GetProperties(),
            p => p.Name.Contains("Team", StringComparison.OrdinalIgnoreCase));
    }
}
