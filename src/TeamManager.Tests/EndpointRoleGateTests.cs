using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using TeamManager.Api.Domain.Authorization;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Presentation.Controllers;
using Xunit;

namespace TeamManager.Tests;

/// <summary>
/// The role attributes are the security payload of workstream D, and an attribute is exactly the
/// kind of thing a refactor drops without any test noticing: every behavioural test here passes
/// against a controller with its gates deleted, because they exercise the services underneath.
/// So the gates themselves are pinned.
///
/// What this cannot pin is intent -- it asserts the attributes that are supposed to be there, and a
/// *new* ungated endpoint is still invisible to it. The paired guard for that is the "both gates"
/// practice in docs/plans/team-admin-rollout.md, not a test.
/// </summary>
public class EndpointRoleGateTests
{
    private static MethodInfo Action(Type controller, string name) =>
        controller.GetMethod(name, BindingFlags.Public | BindingFlags.Instance)
        ?? throw new InvalidOperationException(
            $"{controller.Name}.{name} is gone. If it was renamed, rename it here too rather than " +
            "deleting the case -- that is how a gate quietly stops being tested.");

    private static AuthorizeAttribute? Authorize(Type controller, string action) =>
        Action(controller, action).GetCustomAttribute<AuthorizeAttribute>();

    private static void AssertLeadOnly(Type controller, string action)
    {
        var attr = Authorize(controller, action);

        Assert.True(attr is not null,
            $"{controller.Name}.{action} has no [Authorize]. Bare [Authorize] would be no better: it " +
            "is identical to the global FallbackPolicy in Program.cs, so it reads as a gate and " +
            "restricts nothing.");

        Assert.Equal("TeamLead", attr!.Roles);
    }

    // --- AccessRequestsController ----------------------------------------------------------

    [Theory]
    [InlineData(nameof(AccessRequestsController.List))]
    [InlineData(nameof(AccessRequestsController.Approve))]
    [InlineData(nameof(AccessRequestsController.Deny))]
    public void Reviewing_access_requests_is_lead_only(string action)
    {
        // List returns every requester's name, email, googleSub and free-text reason; approve grants
        // entry to the app and can place someone in a squad. All three carried a bare [Authorize].
        AssertLeadOnly(typeof(AccessRequestsController), action);
    }

    [Fact]
    public void Submitting_an_access_request_stays_anonymous()
    {
        // The public entry point -- someone with no account is the whole point of it. This is why
        // ApproveDto's SquadId must never be reachable from here; see ApprovalInput's shape test.
        var submit = Action(typeof(AccessRequestsController), nameof(AccessRequestsController.Submit));
        Assert.NotNull(submit.GetCustomAttribute<AllowAnonymousAttribute>());
    }

    // --- SquadsController ------------------------------------------------------------------

    [Theory]
    [InlineData(nameof(SquadsController.Create))]
    [InlineData(nameof(SquadsController.Update))]
    [InlineData(nameof(SquadsController.SetTeam))]
    [InlineData(nameof(SquadsController.Delete))]
    [InlineData(nameof(SquadsController.SetMembers))]
    [InlineData(nameof(SquadsController.SetMemberSquads))]
    public void Squad_writes_are_lead_only(string action)
    {
        // The controller had no role attribute at all: any authenticated member could create, rename
        // and delete squads and rewrite anyone's memberships. [RequireFeature("team")] is not a
        // substitute -- "team" is not in DefaultOffFeatures, so it fails open for a plain Member.
        AssertLeadOnly(typeof(SquadsController), action);
    }

    [Theory]
    [InlineData(nameof(SquadsController.GetAll))]
    [InlineData(nameof(SquadsController.GetById))]
    public void Squad_reads_stay_open(string action)
    {
        // Deliberate, and worth a failing test if someone "tidies" it: squad lists feed the retro
        // board, leave overview, sprints, the k-picker and export. Gating reads would lock plain
        // members out of features that have nothing to do with managing squads. Being in a squad is
        // not the sensitive part; changing who is, is.
        Assert.Null(Authorize(typeof(SquadsController), action));
    }

    // --- The claim that makes the above true for Admin -------------------------------------

    [Fact]
    public void Admin_reaches_every_lead_only_endpoint_above()
    {
        // Each gate names "TeamLead" only. That is not an Admin exclusion because the claims
        // transformer expands Admin to the roles it implies -- which is what lets ~30 attributes
        // stay written in terms of one role. Without this, every assertion above locks Admins out.
        Assert.Contains("TeamLead", RoleHierarchy.Expand(MemberRole.Admin));
    }
}
