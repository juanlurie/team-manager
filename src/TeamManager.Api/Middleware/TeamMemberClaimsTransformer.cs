using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Domain.Authorization;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Middleware;

public class TeamMemberClaimsTransformer(
    AppDbContext db,
    ILogger<TeamMemberClaimsTransformer> logger,
    IConfiguration configuration) : IClaimsTransformation
{
    public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        // API key auth already sets all needed claims in the handler
        var authMethod = principal.FindFirst("AuthMethod")?.Value;
        if (authMethod == "ApiKey") return principal;

        // Try "sub" first (raw JWT), then fall back to NameIdentifier (mapped)
        var sub = principal.FindFirst("sub")?.Value
                 ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        logger.LogInformation("ClaimsTransformer: sub={Sub}, all claims={Claims}", sub, string.Join(", ", principal.Claims.Select(c => $"{c.Type}={c.Value}")));
        if (string.IsNullOrWhiteSpace(sub)) return principal;

        // 1. Try exact ExternalSubjectId match
        var tm = await db.TeamMembers
                         .SingleOrDefaultAsync(m => m.ExternalSubjectId == sub && m.IsActive);

        // 2. Auto-link by email if sub doesn't match but email does
        if (tm == null)
        {
            var email = principal.FindFirst("email")?.Value
                       ?? principal.FindFirst(ClaimTypes.Email)?.Value;

            if (!string.IsNullOrWhiteSpace(email))
            {
                var byEmail = await db.TeamMembers
                                      .SingleOrDefaultAsync(m => m.Email.ToLower() == email.ToLower() && m.IsActive);

                if (byEmail != null)
                {
                    byEmail.ExternalSubjectId = sub;
                    await db.SaveChangesAsync();
                    tm = byEmail;
                    logger.LogInformation("ClaimsTransformer: Auto-linked {Email} to {FirstName} {LastName} (sub={Sub})", email, tm.FirstName, tm.LastName, sub);
                }
            }
        }

        // 3. First-ever login: no members exist yet — bootstrap the admin
        if (tm == null && !await db.TeamMembers.AnyAsync())
        {
            var email = principal.FindFirst("email")?.Value
                       ?? principal.FindFirst(ClaimTypes.Email)?.Value ?? string.Empty;
            var firstName = principal.FindFirst("given_name")?.Value
                           ?? principal.FindFirst("name")?.Value?.Split(' ')[0] ?? "Admin";
            var lastName  = principal.FindFirst("family_name")?.Value
                           ?? (principal.FindFirst("name")?.Value?.Contains(' ') == true
                               ? principal.FindFirst("name")!.Value.Split(' ', 2)[1] : string.Empty);

            tm = new TeamMember
            {
                Id = Guid.NewGuid(),
                FirstName = firstName,
                LastName = lastName,
                Email = email,
                // Admin, not TeamLead: this is the person who has to configure everything, and
                // only an Admin can grant Admin — bootstrapping a TeamLead would leave a fresh
                // deployment with no way to reach the role at all.
                Role = MemberRole.Admin,
                ExternalSubjectId = sub,
                IsActive = true
            };

            db.TeamMembers.Add(tm);
            await db.SaveChangesAsync();
            logger.LogInformation("ClaimsTransformer: Bootstrapped first admin {Email} (sub={Sub})", email, sub);
        }

        if (tm == null)
        {
            logger.LogWarning("ClaimsTransformer: No active TeamMember found for sub={Sub}", sub);
            return principal;
        }

        await EnsureBootstrapAdminAsync(tm);

        logger.LogInformation("ClaimsTransformer: Found member {FirstName} {LastName}, role={Role}", tm.FirstName, tm.LastName, tm.Role);

        var id = (ClaimsIdentity)principal.Identity!;
        id.AddClaim(new Claim("TMID", tm.Id.ToString()));

        // Add role claims from the TeamMember entity so [Authorize(Roles = "...")] works.
        // Must use "role" to match JWT RoleClaimType configured in Program.cs.
        //
        // The transitive set, not just tm.Role: an Admin emitting only role=Admin would fail every
        // [Authorize(Roles = "TeamLead")] site in the API — an Admin who can do *less* than a lead.
        // RoleHierarchy is the single place that decides what implies what.
        foreach (var role in RoleHierarchy.Expand(tm.Role))
            if (!principal.IsInRole(role))
                id.AddClaim(new Claim("role", role));

        return principal;
    }

    /// <summary>
    /// Recovery hatch for a deployment that has members but no Admin.
    ///
    /// The bootstrap above only fires when the members table is *empty*, which is right for a fresh
    /// deployment and useless for an existing one. Every environment that predates the Admin role
    /// therefore has zero Admins, while ~30 endpoints now gate on the tier above TeamLead. Where such
    /// an environment also has no TeamLead, it cannot be fixed from inside the app at all: changing a
    /// role needs TeamLead, and granting Admin needs Admin. That is database surgery on every
    /// deployment, forever, and none of it is written down.
    ///
    /// So: set <c>Bootstrap__AdminEmail</c> and the matching member is promoted on their next request.
    /// Three things keep it from being a back door --
    /// it promotes only the one configured address, never an arbitrary caller;
    /// it does nothing once *any* Admin exists, so it cannot undo a deliberate demotion or be left
    /// switched on as a standing grant;
    /// and it writes the same MemberRoleChange audit row the role endpoint does, with a null ActorId
    /// because no member made this change.
    ///
    /// Ordered so the common path costs no query: unset config and non-matching emails return before
    /// the Admin-existence check, and an Admin short-circuits on the role test.
    /// </summary>
    private async Task EnsureBootstrapAdminAsync(TeamMember tm)
    {
        var bootstrapEmail = configuration["Bootstrap:AdminEmail"];
        if (string.IsNullOrWhiteSpace(bootstrapEmail)) return;
        if (tm.Role == MemberRole.Admin) return;
        if (!string.Equals(tm.Email, bootstrapEmail.Trim(), StringComparison.OrdinalIgnoreCase)) return;

        if (await db.TeamMembers.AnyAsync(m => m.Role == MemberRole.Admin))
        {
            logger.LogInformation(
                "ClaimsTransformer: Bootstrap:AdminEmail matches {Email} but the deployment already has an Admin; leaving the role alone.",
                tm.Email);
            return;
        }

        var previousRole = tm.Role;
        tm.Role = MemberRole.Admin;
        db.MemberRoleChanges.Add(new MemberRoleChange
        {
            MemberId = tm.Id,
            ActorId = null,
            FromRole = previousRole,
            ToRole = MemberRole.Admin
        });
        await db.SaveChangesAsync();

        // Warning, not Information: a privilege grant that no member authorised should be visible in
        // the logs of whoever is watching, and it should be obvious if it happens more than once.
        logger.LogWarning(
            "ClaimsTransformer: Promoted {Email} from {FromRole} to Admin via Bootstrap:AdminEmail -- the deployment had no Admin. Unset the setting once recovery is confirmed.",
            tm.Email, previousRole);
    }
}
