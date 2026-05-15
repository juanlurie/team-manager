using System.Security.Claims;

namespace TeamManager.Api.Middleware;

public class TeamMemberRequiredMiddleware(RequestDelegate next, ILogger<TeamMemberRequiredMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        // Skip for anonymous endpoints (health, swagger, auth-mode, etc.)
        if (!context.User.Identity?.IsAuthenticated == true)
        {
            await next(context);
            return;
        }

        // API key auth bypasses this check — the handler sets its own claims
        var authMethod = context.User.FindFirst("AuthMethod")?.Value;
        if (authMethod == "ApiKey")
        {
            await next(context);
            return;
        }

        // Development auth bypasses this check
        if (context.User.Identity.AuthenticationType == "Development")
        {
            await next(context);
            return;
        }

        // JWT auth: require TMID claim (set by TeamMemberClaimsTransformer)
        var hasTmid = context.User.FindFirst("TMID") != null;
        if (!hasTmid)
        {
            logger.LogWarning("Blocked request: authenticated user has no TMID claim (not a team member). Sub={Sub}",
                context.User.FindFirst("sub")?.Value ?? "unknown");
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new { error = "Access denied. You are not registered as a team member." });
            return;
        }

        await next(context);
    }
}
