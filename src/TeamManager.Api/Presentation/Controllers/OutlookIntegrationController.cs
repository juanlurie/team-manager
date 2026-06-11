using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/integrations/outlook")]
[Authorize]
public class OutlookIntegrationController(
    AppDbContext db,
    IHttpClientFactory httpClientFactory,
    IHttpContextAccessor httpContextAccessor) : ControllerBase
{
    private const string Scopes = "offline_access Calendars.Read User.Read";

    [HttpGet("auth-url")]
    public IActionResult GetAuthUrl()
    {
        var clientId = GetConfigVar("OUTLOOK_CLIENT_ID");
        if (string.IsNullOrEmpty(clientId))
            return BadRequest(new { error = "OUTLOOK_CLIENT_ID config variable is not set." });

        var tenantId = GetConfigVar("OUTLOOK_TENANT_ID").DefaultIfEmpty("common");
        var redirectUri = GetRedirectUri();
        var memberId = GetMemberId();

        var url = "https://login.microsoftonline.com/" + tenantId + "/oauth2/v2.0/authorize"
            + "?client_id=" + Uri.EscapeDataString(clientId)
            + "&response_type=code"
            + "&redirect_uri=" + Uri.EscapeDataString(redirectUri)
            + "&scope=" + Uri.EscapeDataString(Scopes)
            + "&state=" + Uri.EscapeDataString(memberId.ToString())
            + "&response_mode=query";

        return Ok(new { url });
    }

    [HttpGet("callback")]
    [AllowAnonymous]
    public async Task<IActionResult> Callback(
        [FromQuery] string? code,
        [FromQuery] string? state,
        [FromQuery] string? error)
    {
        if (!string.IsNullOrEmpty(error))
            return Redirect("/integrations?outlook_error=" + Uri.EscapeDataString(error));

        if (string.IsNullOrEmpty(code) || !Guid.TryParse(state, out var memberId))
            return Redirect("/integrations?outlook_error=invalid_request");

        var clientId = GetConfigVar("OUTLOOK_CLIENT_ID");
        var clientSecret = GetConfigVar("OUTLOOK_CLIENT_SECRET");
        var tenantId = GetConfigVar("OUTLOOK_TENANT_ID").DefaultIfEmpty("common");
        var redirectUri = GetRedirectUri();

        if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
            return Redirect("/integrations?outlook_error=missing_config");

        var client = httpClientFactory.CreateClient();
        var tokenResp = await client.PostAsync(
            $"https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "authorization_code",
                ["code"] = code,
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret,
                ["redirect_uri"] = redirectUri,
                ["scope"] = Scopes
            }));

        if (!tokenResp.IsSuccessStatusCode)
            return Redirect("/integrations?outlook_error=token_exchange_failed");

        var tokenJson = await tokenResp.Content.ReadAsStringAsync();
        using var tokenDoc = JsonDocument.Parse(tokenJson);
        var root = tokenDoc.RootElement;

        var accessToken = root.GetProperty("access_token").GetString() ?? "";
        var refreshToken = root.TryGetProperty("refresh_token", out var rt) ? rt.GetString() ?? "" : "";
        var expiresIn = root.GetProperty("expires_in").GetInt32();
        var expiry = DateTimeOffset.UtcNow.AddSeconds(expiresIn - 60);

        // Fetch account email from Graph
        var graphClient = httpClientFactory.CreateClient();
        graphClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        var meResp = await graphClient.GetAsync("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName");
        var email = "";
        if (meResp.IsSuccessStatusCode)
        {
            using var meDoc = JsonDocument.Parse(await meResp.Content.ReadAsStringAsync());
            var me = meDoc.RootElement;
            email = me.TryGetProperty("mail", out var mail) && mail.ValueKind != JsonValueKind.Null
                ? mail.GetString() ?? ""
                : me.TryGetProperty("userPrincipalName", out var upn) ? upn.GetString() ?? "" : "";
        }

        var existing = await db.OutlookTokens.FirstOrDefaultAsync(t => t.TeamMemberId == memberId);
        if (existing is not null)
        {
            existing.AccessToken = accessToken;
            existing.RefreshToken = refreshToken;
            existing.TokenExpiry = expiry;
            existing.AccountEmail = email;
            existing.ConnectedAt = DateTimeOffset.UtcNow;
        }
        else
        {
            db.OutlookTokens.Add(new OutlookToken
            {
                TeamMemberId = memberId,
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                TokenExpiry = expiry,
                AccountEmail = email
            });
        }
        await db.SaveChangesAsync();

        return Redirect("/integrations?outlook=connected");
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        var token = await db.OutlookTokens.FirstOrDefaultAsync(t => t.TeamMemberId == GetMemberId());
        if (token is null)
            return Ok(new { isConnected = false, accountEmail = (string?)null });
        return Ok(new { isConnected = true, accountEmail = token.AccountEmail, connectedAt = token.ConnectedAt });
    }

    [HttpGet("events")]
    public async Task<IActionResult> GetEvents([FromQuery] string start, [FromQuery] string end)
    {
        var token = await db.OutlookTokens.FirstOrDefaultAsync(t => t.TeamMemberId == GetMemberId());
        if (token is null)
            return Unauthorized(new { error = "Outlook not connected." });

        var accessToken = await GetValidAccessTokenAsync(token);

        var client = httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        client.DefaultRequestHeaders.Add("Prefer", "outlook.timezone=\"UTC\"");

        var url = "https://graph.microsoft.com/v1.0/me/calendarview"
            + "?startDateTime=" + Uri.EscapeDataString(start)
            + "&endDateTime=" + Uri.EscapeDataString(end)
            + "&$select=subject,start,end,isAllDay,isCancelled,isOnlineMeeting,onlineMeetingUrl,location,showAs"
            + "&$orderby=start/dateTime"
            + "&$top=100";

        var resp = await client.GetAsync(url);
        if (!resp.IsSuccessStatusCode)
        {
            var err = await resp.Content.ReadAsStringAsync();
            return StatusCode((int)resp.StatusCode, new { error = "Failed to fetch calendar events.", detail = err });
        }

        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        var events = doc.RootElement.GetProperty("value").EnumerateArray()
            .Where(e => !e.TryGetProperty("isCancelled", out var c) || !c.GetBoolean())
            .Select(e => new
            {
                subject = e.TryGetProperty("subject", out var s) ? s.GetString() : "(No subject)",
                start = e.GetProperty("start").GetProperty("dateTime").GetString(),
                end = e.GetProperty("end").GetProperty("dateTime").GetString(),
                isAllDay = e.TryGetProperty("isAllDay", out var a) && a.GetBoolean(),
                location = e.TryGetProperty("location", out var loc)
                    && loc.TryGetProperty("displayName", out var dn)
                    && dn.ValueKind != JsonValueKind.Null
                    ? dn.GetString() : null,
                isOnlineMeeting = e.TryGetProperty("isOnlineMeeting", out var om) && om.GetBoolean(),
                joinUrl = e.TryGetProperty("onlineMeetingUrl", out var ou) && ou.ValueKind != JsonValueKind.Null
                    ? ou.GetString() : null,
                showAs = e.TryGetProperty("showAs", out var sa) ? sa.GetString() : null
            })
            .ToList();

        return Ok(events);
    }

    [HttpDelete]
    public async Task<IActionResult> Disconnect()
    {
        var token = await db.OutlookTokens.FirstOrDefaultAsync(t => t.TeamMemberId == GetMemberId());
        if (token is not null)
        {
            db.OutlookTokens.Remove(token);
            await db.SaveChangesAsync();
        }
        return NoContent();
    }

    private async Task<string> GetValidAccessTokenAsync(OutlookToken token)
    {
        if (DateTimeOffset.UtcNow < token.TokenExpiry)
            return token.AccessToken;

        var clientId = GetConfigVar("OUTLOOK_CLIENT_ID");
        var clientSecret = GetConfigVar("OUTLOOK_CLIENT_SECRET");
        var tenantId = GetConfigVar("OUTLOOK_TENANT_ID").DefaultIfEmpty("common");

        var client = httpClientFactory.CreateClient();
        var resp = await client.PostAsync(
            $"https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "refresh_token",
                ["refresh_token"] = token.RefreshToken,
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret,
                ["scope"] = Scopes
            }));

        if (!resp.IsSuccessStatusCode) return token.AccessToken;

        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        var root = doc.RootElement;
        token.AccessToken = root.GetProperty("access_token").GetString() ?? token.AccessToken;
        if (root.TryGetProperty("refresh_token", out var rt))
            token.RefreshToken = rt.GetString() ?? token.RefreshToken;
        token.TokenExpiry = DateTimeOffset.UtcNow.AddSeconds(root.GetProperty("expires_in").GetInt32() - 60);
        await db.SaveChangesAsync();

        return token.AccessToken;
    }

    private Guid GetMemberId()
    {
        var id = HttpContext.Items["TeamMemberId"]?.ToString();
        return Guid.TryParse(id, out var g) ? g : Guid.Empty;
    }

    private string GetConfigVar(string key)
        => db.ConfigVariables.Where(v => v.Key == key).Select(v => v.Value).FirstOrDefault() ?? "";

    private string GetRedirectUri()
    {
        var custom = GetConfigVar("OUTLOOK_REDIRECT_URI");
        if (!string.IsNullOrEmpty(custom)) return custom;
        var req = httpContextAccessor.HttpContext?.Request;
        return req != null ? $"{req.Scheme}://{req.Host}/api/v1/integrations/outlook/callback" : "";
    }
}

internal static class StringExtensions
{
    internal static string DefaultIfEmpty(this string? value, string fallback)
        => string.IsNullOrEmpty(value) ? fallback : value;
}
