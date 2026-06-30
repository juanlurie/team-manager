using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace TeamManager.Api.Middleware;

public class DevelopmentAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private const string DevSub = "dev-teamlead-sub";

    public DevelopmentAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
        : base(options, logger, encoder) { }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // Let ApiKeyAuthenticationHandler handle requests that carry an API key
        if (Request.Headers.ContainsKey("X-API-Key"))
            return Task.FromResult(AuthenticateResult.NoResult());

        // Read optional override from config/env so different devs can point at their own account.
        // We do NOT add email here on purpose — the ClaimsTransformer would then set TMID which
        // causes feature checks to run. Without TMID the RequireFeature attribute skips the check,
        // giving dev mode unrestricted access. auth/me handles the identity lookup separately.
        var devEmail = Context.RequestServices
            .GetService<IConfiguration>()
            ?["DevAuth:Email"] ?? "admin@team.local";

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, DevSub),
            new Claim("sub", DevSub),
            new Claim(ClaimTypes.Role, "TeamLead"),
            new Claim("name", "Dev TeamLead"),
            // DevEmail stored separately so auth/me can use it without triggering transformer lookup
            new Claim("dev_email", devEmail),
        };

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
