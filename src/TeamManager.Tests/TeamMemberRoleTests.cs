using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.TeamMember;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;
using Xunit;

namespace TeamManager.Tests;

/// <summary>
/// Role assignment is a privilege boundary, so its rules are pinned here: only an Admin may grant
/// Admin or change an Admin, the last Admin can't be demoted, and every applied change leaves an
/// audit row. Also guards the shape of the create/update requests -- a Role field reappearing on
/// either is the exact regression that made self-promotion possible.
/// </summary>
public class TeamMemberRoleTests
{
    private static AppDbContext NewDb() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"role-{Guid.NewGuid()}")
            .Options);

    private static TeamMember Member(MemberRole role = MemberRole.Member) => new()
    {
        Id = Guid.NewGuid(),
        FirstName = "Test",
        LastName = "Member",
        Email = $"{Guid.NewGuid():N}@team.local",
        Role = role
    };

    private static async Task<(AppDbContext Db, TeamMemberService Svc, TeamMember Target)> Setup(
        MemberRole targetRole = MemberRole.Member, params TeamMember[] others)
    {
        var db = NewDb();
        var target = Member(targetRole);
        db.TeamMembers.Add(target);
        db.TeamMembers.AddRange(others);
        await db.SaveChangesAsync();
        return (db, new TeamMemberService(db), target);
    }

    [Fact]
    public async Task Lead_can_promote_a_member_to_team_lead()
    {
        var (db, svc, target) = await Setup();

        var result = await svc.UpdateRoleAsync(target.Id, MemberRole.TeamLead, Guid.NewGuid(), callerIsAdmin: false);

        Assert.Equal(RoleChangeOutcome.Success, result.Outcome);
        Assert.Equal("TeamLead", result.Member!.Role);
        Assert.Equal(MemberRole.TeamLead, (await db.TeamMembers.FindAsync(target.Id))!.Role);
    }

    [Fact]
    public async Task Non_admin_cannot_grant_admin()
    {
        var (db, svc, target) = await Setup();

        var result = await svc.UpdateRoleAsync(target.Id, MemberRole.Admin, Guid.NewGuid(), callerIsAdmin: false);

        Assert.Equal(RoleChangeOutcome.Forbidden, result.Outcome);
        Assert.Equal(MemberRole.Member, (await db.TeamMembers.FindAsync(target.Id))!.Role);
    }

    [Fact]
    public async Task Non_admin_cannot_change_an_admins_role()
    {
        // A second Admin exists, so the last-Admin guard isn't what's doing the refusing here.
        var (db, svc, target) = await Setup(MemberRole.Admin, Member(MemberRole.Admin));

        var result = await svc.UpdateRoleAsync(target.Id, MemberRole.Member, Guid.NewGuid(), callerIsAdmin: false);

        Assert.Equal(RoleChangeOutcome.Forbidden, result.Outcome);
        Assert.Equal(MemberRole.Admin, (await db.TeamMembers.FindAsync(target.Id))!.Role);
    }

    [Fact]
    public async Task Admin_can_grant_admin()
    {
        var (db, svc, target) = await Setup();

        var result = await svc.UpdateRoleAsync(target.Id, MemberRole.Admin, Guid.NewGuid(), callerIsAdmin: true);

        Assert.Equal(RoleChangeOutcome.Success, result.Outcome);
        Assert.Equal(MemberRole.Admin, (await db.TeamMembers.FindAsync(target.Id))!.Role);
    }

    [Fact]
    public async Task The_last_admin_cannot_be_demoted_even_by_an_admin()
    {
        var (db, svc, target) = await Setup(MemberRole.Admin);

        var result = await svc.UpdateRoleAsync(target.Id, MemberRole.TeamLead, target.Id, callerIsAdmin: true);

        Assert.Equal(RoleChangeOutcome.LastAdmin, result.Outcome);
        Assert.Equal(MemberRole.Admin, (await db.TeamMembers.FindAsync(target.Id))!.Role);
    }

    [Fact]
    public async Task An_admin_can_be_demoted_while_another_admin_remains()
    {
        var (db, svc, target) = await Setup(MemberRole.Admin, Member(MemberRole.Admin));

        var result = await svc.UpdateRoleAsync(target.Id, MemberRole.Member, Guid.NewGuid(), callerIsAdmin: true);

        Assert.Equal(RoleChangeOutcome.Success, result.Outcome);
        Assert.Equal(MemberRole.Member, (await db.TeamMembers.FindAsync(target.Id))!.Role);
    }

    [Fact]
    public async Task An_inactive_admin_still_counts_toward_the_guard()
    {
        // Deactivation is reversible from the member form; demotion is not. So an inactive Admin
        // keeps the count above zero rather than being treated as already gone.
        var otherAdmin = Member(MemberRole.Admin);
        otherAdmin.IsActive = false;
        var (db, svc, target) = await Setup(MemberRole.Admin, otherAdmin);

        var result = await svc.UpdateRoleAsync(target.Id, MemberRole.Member, Guid.NewGuid(), callerIsAdmin: true);

        Assert.Equal(RoleChangeOutcome.Success, result.Outcome);
    }

    [Fact]
    public async Task Applied_changes_are_audited_with_the_actor()
    {
        var (db, svc, target) = await Setup();
        var actorId = Guid.NewGuid();

        await svc.UpdateRoleAsync(target.Id, MemberRole.TechLead, actorId, callerIsAdmin: false);

        var audit = Assert.Single(await db.MemberRoleChanges.ToListAsync());
        Assert.Equal(target.Id, audit.MemberId);
        Assert.Equal(actorId, audit.ActorId);
        Assert.Equal(MemberRole.Member, audit.FromRole);
        Assert.Equal(MemberRole.TechLead, audit.ToRole);
    }

    [Fact]
    public async Task Refused_and_no_op_changes_write_no_audit_row()
    {
        var (db, svc, target) = await Setup();

        await svc.UpdateRoleAsync(target.Id, MemberRole.Admin, Guid.NewGuid(), callerIsAdmin: false);
        await svc.UpdateRoleAsync(target.Id, MemberRole.Member, Guid.NewGuid(), callerIsAdmin: false);

        Assert.Empty(await db.MemberRoleChanges.ToListAsync());
    }

    [Fact]
    public async Task Missing_member_is_not_found()
    {
        var (_, svc, _) = await Setup();

        var result = await svc.UpdateRoleAsync(Guid.NewGuid(), MemberRole.TeamLead, Guid.NewGuid(), callerIsAdmin: true);

        Assert.Equal(RoleChangeOutcome.NotFound, result.Outcome);
    }

    [Fact]
    public void Member_create_and_update_requests_carry_no_role_field()
    {
        Assert.Null(typeof(CreateTeamMemberRequest).GetProperty("Role"));
        Assert.Null(typeof(UpdateTeamMemberRequest).GetProperty("Role"));
    }

    [Fact]
    public async Task Updating_a_member_leaves_their_role_alone()
    {
        var (db, svc, target) = await Setup(MemberRole.TeamLead);

        await svc.UpdateAsync(target.Id, new UpdateTeamMemberRequest(
            "Renamed", "Member", target.Email, TeamLeadId: null, IsActive: true));

        Assert.Equal(MemberRole.TeamLead, (await db.TeamMembers.FindAsync(target.Id))!.Role);
    }

    [Fact]
    public async Task Reactivating_a_member_through_create_leaves_their_role_alone()
    {
        var (db, svc, target) = await Setup(MemberRole.TeamLead);
        target.IsActive = false;
        await db.SaveChangesAsync();

        await svc.CreateAsync(new CreateTeamMemberRequest("Test", "Member", target.Email, TeamLeadId: null));

        var reactivated = await db.TeamMembers.FindAsync(target.Id);
        Assert.True(reactivated!.IsActive);
        Assert.Equal(MemberRole.TeamLead, reactivated.Role);
    }

    [Fact]
    public async Task New_members_start_as_member()
    {
        var (db, svc, _) = await Setup();

        var created = await svc.CreateAsync(new CreateTeamMemberRequest(
            "Brand", "New", "brand.new@team.local", TeamLeadId: null));

        Assert.Equal("Member", created.Role);
    }
}
