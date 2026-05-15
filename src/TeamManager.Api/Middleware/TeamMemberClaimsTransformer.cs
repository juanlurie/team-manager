using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Middleware;

public class TeamMemberClaimsTransformer(AppDbContext db, ILogger<TeamMemberClaimsTransformer> logger) : IClaimsTransformation
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

        if (tm == null)
        {
            logger.LogWarning("ClaimsTransformer: No active TeamMember found for sub={Sub}", sub);
            return principal;
        }

        logger.LogInformation("ClaimsTransformer: Found member {FirstName} {LastName}, role={Role}", tm.FirstName, tm.LastName, tm.Role);

        var id = (ClaimsIdentity)principal.Identity!;
        id.AddClaim(new Claim("TMID", tm.Id.ToString()));

        // Add role claim from TeamMember entity so [Authorize(Roles = "...")] works
        // Must use "role" to match JWT RoleClaimType configured in Program.cs
        if (!principal.IsInRole(tm.Role.ToString()))
            id.AddClaim(new Claim("role", tm.Role.ToString()));

        return principal;
    }
}
