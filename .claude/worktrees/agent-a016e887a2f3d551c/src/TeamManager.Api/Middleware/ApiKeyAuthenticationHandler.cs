using System.Security.Claims;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Middleware;

public class ApiKeyAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private const string HeaderName = "X-API-Key";

    public ApiKeyAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder) { }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(HeaderName, out var keyValues) ||
            string.IsNullOrWhiteSpace(keyValues.FirstOrDefault()))
            return AuthenticateResult.NoResult();

        var rawKey = keyValues.First()!;
        var keyHash = HashKey(rawKey);

        var scope = Context.RequestServices.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var apiKey = await db.ApiKeys
            .IgnoreQueryFilters()
            .Include(k => k.TeamMember)
            .FirstOrDefaultAsync(k => k.KeyHash == keyHash);

        if (apiKey == null || !apiKey.IsActive)
            return AuthenticateResult.Fail("Invalid API key.");

        if (apiKey.ExpiresAt.HasValue && apiKey.ExpiresAt.Value < DateTimeOffset.UtcNow)
            return AuthenticateResult.Fail("API key has expired.");

        apiKey.LastUsedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        var member = apiKey.TeamMember;
        if (!member.IsActive)
            return AuthenticateResult.Fail("Associated team member is inactive.");

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, member.Id.ToString()),
            new("sub", $"apikey:{apiKey.Id}"),
            new("name", $"{member.FirstName} {member.LastName}"),
            new("role", member.Role.ToString()),
            new("TMID", member.Id.ToString()),
            new("AuthMethod", "ApiKey"),
        };

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        return AuthenticateResult.Success(ticket);
    }

    private static string HashKey(string key)
    {
        using var sha = System.Security.Cryptography.SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(key));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
