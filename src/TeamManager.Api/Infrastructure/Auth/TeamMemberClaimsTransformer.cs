using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Core.Models;
using Microsoft.AspNetCore.Authentication;

public sealed class TeamMemberClaimsTransformer : IClaimsTransformation
{
    private readonly AppDbContext _db;
    public TeamMemberClaimsTransformer(AppDbContext db) => _db = db;

    public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal p)
    {
        if (p.Identity?.IsAuthenticated != true) return p;

        var sub = p.FindFirst("sub")?.Value;
        if (string.IsNullOrWhiteSpace(sub)) return p;

        var member = await _db.TeamMembers
                              .AsNoTracking()
                              .SingleOrDefaultAsync(m => m.ExternalSubjectId == sub);
        if (member == null) return p;   // unknown user – request will still 403

        var id = new ClaimsIdentity(p.Identity.AuthenticationType);

        id.AddClaim(new Claim("teamMemberId", member.Id.ToString()));
        if (member.Role == Role.TeamLead) id.AddClaim(new Claim("role", "TeamLead"));
        if (member.Role == Role.TechLead) id.AddClaim(new Claim("role", "TechLead"));

        p.AddIdentity(id);
        return p;
    }
}
