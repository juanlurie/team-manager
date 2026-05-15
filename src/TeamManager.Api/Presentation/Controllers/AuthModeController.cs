using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[AllowAnonymous]
public class AuthModeController(IConfiguration configuration, IHttpClientFactory httpClientFactory) : ControllerBase
{
    [HttpGet("api/auth-mode")]
    public IActionResult Get()
    {
        var authRequired = !string.IsNullOrEmpty(configuration["Jwt:Authority"])
                        && !string.IsNullOrEmpty(configuration["Jwt:Audience"]);
        return Ok(new { authRequired });
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
