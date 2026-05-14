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
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "65f1106f-6020-419f-bced-4011857e9f9b"),
            new Claim("sub", DevSub),
            new Claim(ClaimTypes.Role, "TeamLead"),
            new Claim("name", "Dev TeamLead")
        };

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
