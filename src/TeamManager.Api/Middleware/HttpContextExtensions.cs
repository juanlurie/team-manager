using Microsoft.AspNetCore.Http;

namespace TeamManager.Api.Middleware;

public static class HttpContextExtensions
{
    public static Guid GetCurrentMemberId(this HttpContext context)
    {
        var nameIdClaim = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (Guid.TryParse(nameIdClaim, out var memberId))
            return memberId;

        var tmidClaim = context.User.FindFirst("TMID")?.Value;
        if (Guid.TryParse(tmidClaim, out var tmid))
            return tmid;

        return Guid.Empty;
    }
}
