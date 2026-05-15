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

        var tm = await db.TeamMembers
                         .AsNoTracking()
                         .SingleOrDefaultAsync(m => m.ExternalSubjectId == sub && m.IsActive);

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
