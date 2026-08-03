using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Domain.Authorization;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;
using Xunit;

namespace TeamManager.Tests;

/// <summary>
/// "Admin has all permissions" is only true if it is a property of the system rather than a promise
/// maintained by hand, so the two mechanisms that make it so are pinned here: the claims transformer
/// expanding Admin to the roles it implies (~30 [Authorize(Roles = "TeamLead")] sites depend on it),
/// and FeaturePermissionService answering Admin unconditionally instead of relying on seeded rows.
/// </summary>
public class AdminRoleTests
{
    private static AppDbContext NewDb() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"admin-{Guid.NewGuid()}")
            .Options);

    private static TeamMember Member(MemberRole role, string? sub = null) => new()
    {
        Id = Guid.NewGuid(),
        FirstName = "Test",
        LastName = "Member",
        Email = $"{Guid.NewGuid():N}@team.local",
        Role = role,
        ExternalSubjectId = sub,
        IsActive = true
    };

    // "role" as the role claim type matches the RoleClaimType configured in Program.cs, so
    // IsInRole here tests the same thing [Authorize(Roles = ...)] does at runtime.
    private static ClaimsPrincipal Principal(params Claim[] claims) =>
        new(new ClaimsIdentity(claims, "Test", "name", "role"));

    private static Task<ClaimsPrincipal> Transform(
        AppDbContext db, ClaimsPrincipal principal, string? bootstrapAdminEmail = null) =>
        new TeamMemberClaimsTransformer(
                db,
                NullLogger<TeamMemberClaimsTransformer>.Instance,
                Config(bootstrapAdminEmail))
            .TransformAsync(principal);

    /// <summary>Null leaves Bootstrap:AdminEmail unset, which is how every deployment runs normally.</summary>
    private static IConfiguration Config(string? bootstrapAdminEmail) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(bootstrapAdminEmail is null
                ? []
                : new Dictionary<string, string?> { ["Bootstrap:AdminEmail"] = bootstrapAdminEmail })
            .Build();

    // --- RoleHierarchy ---------------------------------------------------------------------

    [Fact]
    public void Admin_implies_team_lead()
    {
        Assert.Contains("TeamLead", RoleHierarchy.Expand(MemberRole.Admin));
    }

    [Fact]
    public void Admin_does_not_imply_tech_lead()
    {
        // TechLead is a role within a team with no management significance -- a sibling of
        // TeamLead, not a tier below it. Claiming it would put Admins in "who are the tech
        // leads" lists; the checks that pair the two are satisfied by the TeamLead claim.
        Assert.DoesNotContain("TechLead", RoleHierarchy.Expand(MemberRole.Admin));
    }

    [Fact]
    public void Every_role_authorises_itself()
    {
        // Guards the next role added to the enum: absent from the map is fine, absent from its
        // own claim set is a member locked out of their own role's endpoints.
        foreach (var role in Enum.GetValues<MemberRole>())
            Assert.Contains(role.ToString(), RoleHierarchy.Expand(role));
    }

    [Fact]
    public void Lesser_roles_are_not_widened()
    {
        Assert.Equal(["TeamLead"], RoleHierarchy.Expand(MemberRole.TeamLead));
        Assert.Equal(["Member"], RoleHierarchy.Expand(MemberRole.Member));
        Assert.Equal(["TechLead"], RoleHierarchy.Expand(MemberRole.TechLead));
    }

    // --- Claims transformer ----------------------------------------------------------------

    [Fact]
    public async Task An_admin_passes_a_team_lead_role_gate()
    {
        var db = NewDb();
        db.TeamMembers.Add(Member(MemberRole.Admin, sub: "admin-sub"));
        await db.SaveChangesAsync();

        var result = await Transform(db, Principal(new Claim("sub", "admin-sub")));

        Assert.True(result.IsInRole("Admin"));
        Assert.True(result.IsInRole("TeamLead"));
    }

    [Fact]
    public async Task A_team_lead_does_not_gain_admin()
    {
        var db = NewDb();
        db.TeamMembers.Add(Member(MemberRole.TeamLead, sub: "lead-sub"));
        await db.SaveChangesAsync();

        var result = await Transform(db, Principal(new Claim("sub", "lead-sub")));

        Assert.True(result.IsInRole("TeamLead"));
        Assert.False(result.IsInRole("Admin"));
    }

    [Fact]
    public async Task The_first_ever_login_bootstraps_an_admin()
    {
        // Only an Admin can grant Admin, so bootstrapping a TeamLead would leave a fresh
        // deployment unable to reach the role at all.
        var db = NewDb();

        var result = await Transform(db, Principal(
            new Claim("sub", "first-sub"),
            new Claim("email", "founder@team.local")));

        var created = Assert.Single(await db.TeamMembers.ToListAsync());
        Assert.Equal(MemberRole.Admin, created.Role);
        Assert.True(result.IsInRole("Admin"));
        Assert.True(result.IsInRole("TeamLead"));
    }

    [Fact]
    public async Task A_second_login_does_not_bootstrap_anyone()
    {
        var db = NewDb();
        db.TeamMembers.Add(Member(MemberRole.Member, sub: "existing-sub"));
        await db.SaveChangesAsync();

        await Transform(db, Principal(
            new Claim("sub", "stranger-sub"),
            new Claim("email", "stranger@team.local")));

        Assert.Single(await db.TeamMembers.ToListAsync());
    }

    // --- Feature gating --------------------------------------------------------------------

    private static async Task<(AppDbContext Db, FeaturePermissionService Svc, TeamMember Admin)> FeatureSetup()
    {
        var db = NewDb();
        var admin = Member(MemberRole.Admin);
        db.TeamMembers.Add(admin);
        await db.SaveChangesAsync();
        return (db, new FeaturePermissionService(db), admin);
    }

    [Fact]
    public async Task An_admin_has_features_that_default_off()
    {
        var (_, svc, admin) = await FeatureSetup();

        Assert.True(await svc.IsFeatureEnabledForMemberAsync(admin.Id, "settings"));
    }

    [Fact]
    public async Task A_disabled_role_row_does_not_apply_to_an_admin()
    {
        var (db, svc, admin) = await FeatureSetup();
        db.FeaturePermissions.Add(new FeaturePermission
        {
            Id = Guid.NewGuid(), FeatureKey = "settings", Category = "Admin",
            Label = "Settings", Role = "Admin", IsEnabled = false
        });
        await db.SaveChangesAsync();

        Assert.True(await svc.IsFeatureEnabledForMemberAsync(admin.Id, "settings"));
    }

    [Fact]
    public async Task A_member_override_does_not_apply_to_an_admin()
    {
        var (db, svc, admin) = await FeatureSetup();
        db.MemberFeatureOverrides.Add(new MemberFeatureOverride
        {
            Id = Guid.NewGuid(), TeamMemberId = admin.Id, FeatureKey = "settings", IsEnabled = false
        });
        await db.SaveChangesAsync();

        Assert.True(await svc.IsFeatureEnabledForMemberAsync(admin.Id, "settings"));
        Assert.All(await svc.GetMemberOverridesAsync(admin.Id), o => Assert.True(o.IsEnabled));
    }

    [Fact]
    public async Task Admin_feature_permissions_cannot_be_written()
    {
        // Refused rather than stored-and-ignored: a row nothing reads is a permission that looks
        // set and isn't.
        var (_, svc, admin) = await FeatureSetup();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.UpdateRolePermissionAsync("settings", "Admin", false));
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.UpdateMemberOverrideAsync(admin.Id, "settings", false));
    }

    [Fact]
    public async Task The_settings_matrix_has_a_column_for_every_role()
    {
        // Derived from the enum rather than restated, so a new role can't be silently missing
        // from the matrix (rollout plan, "Gaps found" #4).
        var (_, svc, _) = await FeatureSetup();

        var groups = await svc.GetAllRolePermissionsAsync();
        var roles = groups.SelectMany(g => g.Permissions).Select(p => p.Role).Distinct().Order();

        Assert.Equal(Enum.GetNames<MemberRole>().Order(), roles);
    }

    [Fact]
    public async Task The_matrix_reports_admin_as_enabled_regardless_of_what_is_stored()
    {
        var (db, svc, _) = await FeatureSetup();
        db.FeaturePermissions.Add(new FeaturePermission
        {
            Id = Guid.NewGuid(), FeatureKey = "settings", Category = "Admin",
            Label = "Settings", Role = "Admin", IsEnabled = false
        });
        await db.SaveChangesAsync();

        var groups = await svc.GetAllRolePermissionsAsync();
        var adminRows = groups.SelectMany(g => g.Permissions).Where(p => p.Role == "Admin");

        Assert.NotEmpty(adminRows);
        Assert.All(adminRows, p => Assert.True(p.IsEnabled));
    }

    // --- Bootstrap:AdminEmail recovery hatch ------------------------------------------------
    //
    // A deployment that predates the Admin role has members but no Admin, and the first-login
    // bootstrap only fires on an empty table -- so it is stuck below gates it cannot reach. The
    // safety properties matter more here than the happy path: this promotes someone without any
    // member having authorised it, so each thing stopping it being a back door gets a test.

    private static async Task<(AppDbContext Db, TeamMember Member)> BootstrapSetup(
        MemberRole role, string email = "lead@team.local")
    {
        var db = NewDb();
        var member = Member(role, sub: "sub-bootstrap");
        member.Email = email;
        db.TeamMembers.Add(member);
        await db.SaveChangesAsync();
        return (db, member);
    }

    [Fact]
    public async Task The_configured_email_is_promoted_when_the_deployment_has_no_admin()
    {
        var (db, member) = await BootstrapSetup(MemberRole.Member);

        var result = await Transform(db, Principal(new Claim("sub", "sub-bootstrap")), "lead@team.local");

        Assert.Equal(MemberRole.Admin, (await db.TeamMembers.FindAsync(member.Id))!.Role);
        // And the claims for *this* request already carry it -- otherwise recovery would need a
        // second sign-in to take effect, which is exactly the confusion this is meant to end.
        Assert.True(result.IsInRole("Admin"));
        Assert.True(result.IsInRole("TeamLead"));
    }

    [Fact]
    public async Task Promotion_is_audited_like_any_other_role_change()
    {
        var (db, member) = await BootstrapSetup(MemberRole.TechLead);

        await Transform(db, Principal(new Claim("sub", "sub-bootstrap")), "lead@team.local");

        var audit = Assert.Single(await db.MemberRoleChanges.ToListAsync());
        Assert.Equal(member.Id, audit.MemberId);
        Assert.Equal(MemberRole.TechLead, audit.FromRole);
        Assert.Equal(MemberRole.Admin, audit.ToRole);
        // No member made this change, which is what ActorId being nullable is for.
        Assert.Null(audit.ActorId);
    }

    [Fact]
    public async Task Nothing_happens_once_the_deployment_already_has_an_admin()
    {
        // The property that stops this being a standing grant: left switched on, it cannot re-promote
        // someone an Admin deliberately demoted, and it cannot be used to mint a second Admin.
        var (db, member) = await BootstrapSetup(MemberRole.Member);
        db.TeamMembers.Add(Member(MemberRole.Admin));
        await db.SaveChangesAsync();

        await Transform(db, Principal(new Claim("sub", "sub-bootstrap")), "lead@team.local");

        Assert.Equal(MemberRole.Member, (await db.TeamMembers.FindAsync(member.Id))!.Role);
        Assert.Empty(await db.MemberRoleChanges.ToListAsync());
    }

    [Fact]
    public async Task A_member_whose_email_does_not_match_is_never_promoted()
    {
        var (db, member) = await BootstrapSetup(MemberRole.Member, "someone.else@team.local");

        await Transform(db, Principal(new Claim("sub", "sub-bootstrap")), "lead@team.local");

        Assert.Equal(MemberRole.Member, (await db.TeamMembers.FindAsync(member.Id))!.Role);
    }

    [Fact]
    public async Task The_email_match_ignores_case_and_surrounding_whitespace()
    {
        // It is going into a k8s env var by hand at the point someone is locked out and frustrated.
        var (db, member) = await BootstrapSetup(MemberRole.Member, "Lead@Team.Local");

        await Transform(db, Principal(new Claim("sub", "sub-bootstrap")), "  lead@team.local  ");

        Assert.Equal(MemberRole.Admin, (await db.TeamMembers.FindAsync(member.Id))!.Role);
    }

    [Fact]
    public async Task Unset_config_changes_nothing()
    {
        // The normal state of every deployment, including the one that has never needed this.
        var (db, member) = await BootstrapSetup(MemberRole.Member);

        await Transform(db, Principal(new Claim("sub", "sub-bootstrap")));

        Assert.Equal(MemberRole.Member, (await db.TeamMembers.FindAsync(member.Id))!.Role);
        Assert.Empty(await db.MemberRoleChanges.ToListAsync());
    }

    [Fact]
    public async Task An_empty_setting_is_treated_as_unset_rather_than_matching_a_blank_email()
    {
        var (db, member) = await BootstrapSetup(MemberRole.Member, email: "");

        await Transform(db, Principal(new Claim("sub", "sub-bootstrap")), "   ");

        Assert.Equal(MemberRole.Member, (await db.TeamMembers.FindAsync(member.Id))!.Role);
    }
}
