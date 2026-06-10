using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[AllowAnonymous]
public class AuthModeController(IConfiguration configuration, IHttpClientFactory httpClientFactory, AppDbContext db) : ControllerBase
{
    [HttpGet("api/auth-mode")]
    public IActionResult Get()
    {
        var authRequired = !string.IsNullOrEmpty(configuration["Jwt:Authority"])
                        && !string.IsNullOrEmpty(configuration["Jwt:Audience"]);
        return Ok(new { authRequired });
    }

    [HttpGet("api/auth/me")]
    [AllowAnonymous]
    public async Task<IActionResult> Me()
    {
        if (User.Identity?.IsAuthenticated != true)
            return Unauthorized();

        var tmid = User.FindFirst("TMID")?.Value;
        if (string.IsNullOrEmpty(tmid))
        {
            // Return Google claims so the frontend can pre-fill the access request form
            return StatusCode(403, new
            {
                error = "not_registered",
                googleClaims = new
                {
                    name    = User.FindFirst("name")?.Value ?? User.FindFirst("given_name")?.Value ?? "",
                    email   = User.FindFirst("email")?.Value ?? "",
                    picture = User.FindFirst("picture")?.Value ?? "",
                    sub     = User.FindFirst("sub")?.Value ?? ""
                }
            });
        }

        var member = await db.TeamMembers.FindAsync(Guid.Parse(tmid));
        if (member == null || !member.IsActive)
            return Forbid();

        return Ok(new
        {
            id = member.Id,
            firstName = member.FirstName,
            lastName = member.LastName,
            email = member.Email,
            role = member.Role
        });
    }

    // The browser sends the authorization code here (form-encoded, same format
    // that angular-oauth2-oidc would post directly to Google).  We add the
    // client_secret server-side so it never reaches the browser.
    [HttpPost("api/auth/exchange")]
    [Consumes("application/x-www-form-urlencoded")]
    public async Task<IActionResult> Exchange([FromForm] IFormCollection form)
    {
        var clientId     = configuration["Jwt:Audience"];
        var clientSecret = configuration["Jwt:ClientSecret"];

        if (string.IsNullOrEmpty(clientSecret))
            return StatusCode(501, new { error = "server_misconfigured", error_description = "Jwt:ClientSecret is not set." });

        // Forward every field the library sent, then inject the secret.
        var fields = form
            .Where(kv => kv.Key != "client_secret")   // strip any accidental secret from browser
            .ToDictionary(kv => kv.Key, kv => kv.Value.ToString());

        fields["client_id"]     = clientId!;
        fields["client_secret"] = clientSecret;

        var httpClient = httpClientFactory.CreateClient();
        var response   = await httpClient.PostAsync(
            "https://oauth2.googleapis.com/token",
            new FormUrlEncodedContent(fields));

        var body = await response.Content.ReadAsStringAsync();
        return response.IsSuccessStatusCode
            ? Content(body, "application/json")
            : StatusCode((int)response.StatusCode, body);
    }
}
