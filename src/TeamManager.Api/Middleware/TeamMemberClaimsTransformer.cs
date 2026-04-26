using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Infrastructure.Models;

namespace TeamManager.Api.Middleware;

public class TeamMemberClaimsTransformer(AppDbContext db) : IClaimsTransformation
{
    public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        var sub = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrWhiteSpace(sub)) return principal;

        var tm = await db.TeamMembers
                         .AsNoTracking()
                         .SingleOrDefaultAsync(m => m.ExternalSubjectId == sub && m.IsActive);

        if (tm == null) return principal;   // 403 will be handled by the fallback auth policy

        var id = (ClaimsIdentity)principal.Identity!;
        id.AddClaim(new Claim("TMID", tm.Id.ToString()));
        return principal;
    }
}
