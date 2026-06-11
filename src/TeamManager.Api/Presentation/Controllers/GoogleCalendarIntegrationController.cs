using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/integrations/google-calendar")]
[Authorize]
public class GoogleCalendarIntegrationController(
    AppDbContext db,
    IHttpClientFactory httpClientFactory,
    IHttpContextAccessor httpContextAccessor,
    ILogger<GoogleCalendarIntegrationController> logger) : ControllerBase
{
    private const string Scopes = "openid email https://www.googleapis.com/auth/calendar.readonly";

    [HttpGet("auth-url")]
    public IActionResult GetAuthUrl()
    {
        var clientId = GetConfigVar("GOOGLE_CLIENT_ID");
        if (string.IsNullOrEmpty(clientId))
            return BadRequest(new { error = "GOOGLE_CLIENT_ID config variable is not set." });

        var redirectUri = GetRedirectUri();
        var memberId = GetMemberId();

        var url = "https://accounts.google.com/o/oauth2/v2/auth"
            + "?client_id=" + Uri.EscapeDataString(clientId)
            + "&response_type=code"
            + "&redirect_uri=" + Uri.EscapeDataString(redirectUri)
            + "&scope=" + Uri.EscapeDataString(Scopes)
            + "&state=" + Uri.EscapeDataString(memberId.ToString())
            + "&access_type=offline"
            + "&prompt=consent";

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
            return Redirect("/integrations?gcal_error=" + Uri.EscapeDataString(error));

        if (string.IsNullOrEmpty(code) || !Guid.TryParse(state, out var memberId))
            return Redirect("/integrations?gcal_error=invalid_request");

        var clientId = GetConfigVar("GOOGLE_CLIENT_ID");
        var clientSecret = GetConfigVar("GOOGLE_CLIENT_SECRET");
        var redirectUri = GetRedirectUri();

        if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
            return Redirect("/integrations?gcal_error=missing_config");

        var client = httpClientFactory.CreateClient();
        var tokenResp = await client.PostAsync(
            "https://oauth2.googleapis.com/token",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "authorization_code",
                ["code"] = code,
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret,
                ["redirect_uri"] = redirectUri
            }));

        if (!tokenResp.IsSuccessStatusCode)
            return Redirect("/integrations?gcal_error=token_exchange_failed");

        using var tokenDoc = JsonDocument.Parse(await tokenResp.Content.ReadAsStringAsync());
        var root = tokenDoc.RootElement;

        var accessToken = root.GetProperty("access_token").GetString() ?? "";
        var refreshToken = root.TryGetProperty("refresh_token", out var rt) ? rt.GetString() ?? "" : "";
        var expiresIn = root.TryGetProperty("expires_in", out var ei) ? ei.GetInt32() : 3600;
        var expiry = DateTimeOffset.UtcNow.AddSeconds(expiresIn - 60);

        // Fetch account email
        var graphClient = httpClientFactory.CreateClient();
        graphClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        var meResp = await graphClient.GetAsync("https://www.googleapis.com/oauth2/v2/userinfo");
        var email = "";
        if (meResp.IsSuccessStatusCode)
        {
            using var meDoc = JsonDocument.Parse(await meResp.Content.ReadAsStringAsync());
            email = meDoc.RootElement.TryGetProperty("email", out var e) ? e.GetString() ?? "" : "";
        }

        // Match by email within this member's tokens (allows multiple accounts)
        var existing = await db.GoogleCalendarTokens.FirstOrDefaultAsync(t =>
            t.TeamMemberId == memberId && t.AccountEmail == email);
        if (existing is not null)
        {
            existing.AccessToken = accessToken;
            if (!string.IsNullOrEmpty(refreshToken)) existing.RefreshToken = refreshToken;
            existing.TokenExpiry = expiry;
            existing.AccountEmail = email;
            existing.ConnectedAt = DateTimeOffset.UtcNow;
        }
        else
        {
            db.GoogleCalendarTokens.Add(new GoogleCalendarToken
            {
                TeamMemberId = memberId,
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                TokenExpiry = expiry,
                AccountEmail = email
            });
        }
        await db.SaveChangesAsync();

        return Redirect("/integrations?gcal=connected");
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        var tokens = await db.GoogleCalendarTokens
            .Where(t => t.TeamMemberId == GetMemberId())
            .OrderBy(t => t.ConnectedAt)
            .ToListAsync();
        return Ok(new
        {
            isConnected = tokens.Count > 0,
            accounts = tokens.Select(t => new { id = t.Id, accountEmail = t.AccountEmail, connectedAt = t.ConnectedAt })
        });
    }

    [HttpGet("events")]
    public async Task<IActionResult> GetEvents([FromQuery] string start, [FromQuery] string end)
    {
        var tokens = await db.GoogleCalendarTokens
            .Where(t => t.TeamMemberId == GetMemberId())
            .ToListAsync();
        if (tokens.Count == 0)
            return Unauthorized(new { error = "Google Calendar not connected." });

        var tasks = tokens.Select(token => FetchGoogleEventsAsync(token, start, end));
        var results = await Task.WhenAll(tasks);
        var merged = results
            .SelectMany(r => r)
            .OrderBy(e => e.Start)
            .ToList();

        return Ok(merged);
    }

    [HttpDelete("{tokenId:guid}")]
    public async Task<IActionResult> Disconnect(Guid tokenId)
    {
        var token = await db.GoogleCalendarTokens.FirstOrDefaultAsync(t =>
            t.Id == tokenId && t.TeamMemberId == GetMemberId());
        if (token is not null)
        {
            db.GoogleCalendarTokens.Remove(token);
            await db.SaveChangesAsync();
        }
        return NoContent();
    }

    private async Task<IEnumerable<GoogleCalendarEventDto>> FetchGoogleEventsAsync(GoogleCalendarToken token, string start, string end)
    {
        var accessToken = await GetValidAccessTokenAsync(token);
        var client = httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

        // Get all calendars the user has access to (includes "Other calendars" like subscribed ICS)
        var calendarIds = new List<string> { "primary" };
        try
        {
            var listResp = await client.GetAsync(
                "https://www.googleapis.com/calendar/v3/users/me/calendarList?fields=items(id,selected,accessRole)");
            if (listResp.IsSuccessStatusCode)
            {
                using var listDoc = JsonDocument.Parse(await listResp.Content.ReadAsStringAsync());
                if (listDoc.RootElement.TryGetProperty("items", out var items))
                {
                    calendarIds = items.EnumerateArray()
                        .Where(c =>
                            // Include if selected (visible in Google Calendar) and we can read it
                            (!c.TryGetProperty("selected", out var sel) || sel.GetBoolean()) &&
                            c.TryGetProperty("accessRole", out var role) &&
                            role.GetString() is "owner" or "writer" or "reader" or "freeBusyReader")
                        .Select(c => c.GetProperty("id").GetString() ?? "primary")
                        .Distinct()
                        .ToList();

                    if (calendarIds.Count == 0) calendarIds = ["primary"];
                }
            }
        }
        catch { /* fall back to primary only */ }

        var allEvents = new List<GoogleCalendarEventDto>();

        foreach (var calId in calendarIds)
        {
            var url = "https://www.googleapis.com/calendar/v3/calendars/" + Uri.EscapeDataString(calId) + "/events"
                + "?timeMin=" + Uri.EscapeDataString(start)
                + "&timeMax=" + Uri.EscapeDataString(end)
                + "&singleEvents=true"
                + "&orderBy=startTime"
                + "&maxResults=100"
                + "&fields=items(summary,start,end,location,hangoutLink,conferenceData,status,transparency)";

            var resp = await client.GetAsync(url);
            if (!resp.IsSuccessStatusCode)
            {
                logger.LogError("Google Calendar API error {Status} for calendar {Cal} token {Id}", (int)resp.StatusCode, calId, token.Id);
                continue;
            }

            using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
            if (!doc.RootElement.TryGetProperty("items", out var itemsEl))
                continue;

            allEvents.AddRange(itemsEl.EnumerateArray()
                .Where(e => !(e.TryGetProperty("status", out var s) && s.GetString() == "cancelled"))
                .Select(e =>
                {
                    var startEl = e.GetProperty("start");
                    var endEl = e.GetProperty("end");
                    var isAllDay = startEl.TryGetProperty("date", out _) && !startEl.TryGetProperty("dateTime", out _);
                    var startStr = isAllDay
                        ? startEl.GetProperty("date").GetString() + "T00:00:00"
                        : startEl.GetProperty("dateTime").GetString() ?? "";
                    var endStr = isAllDay
                        ? endEl.GetProperty("date").GetString() + "T00:00:00"
                        : endEl.GetProperty("dateTime").GetString() ?? "";
                    var joinUrl = e.TryGetProperty("hangoutLink", out var hl) && hl.ValueKind != JsonValueKind.Null
                        ? hl.GetString()
                        : e.TryGetProperty("conferenceData", out var cd)
                            && cd.TryGetProperty("entryPoints", out var eps)
                            && eps.ValueKind == JsonValueKind.Array
                            ? eps.EnumerateArray()
                                .Where(ep => ep.TryGetProperty("entryPointType", out var t) && t.GetString() == "video")
                                .Select(ep => ep.TryGetProperty("uri", out var u) ? u.GetString() : null)
                                .FirstOrDefault()
                            : null;
                    return new GoogleCalendarEventDto(
                        Subject: e.TryGetProperty("summary", out var sub) ? sub.GetString() : "(No title)",
                        Start: startStr,
                        End: endStr,
                        IsAllDay: isAllDay,
                        Location: e.TryGetProperty("location", out var loc) && loc.ValueKind != JsonValueKind.Null
                            ? loc.GetString() : null,
                        IsOnlineMeeting: joinUrl != null,
                        JoinUrl: joinUrl,
                        ShowAs: e.TryGetProperty("transparency", out var tr) && tr.GetString() == "transparent"
                            ? "free" : null
                    );
                }));
        }

        return allEvents;
    }

    private record GoogleCalendarEventDto(
        string? Subject, string Start, string End, bool IsAllDay,
        string? Location, bool IsOnlineMeeting, string? JoinUrl, string? ShowAs);

    private async Task<string> GetValidAccessTokenAsync(GoogleCalendarToken token)
    {
        if (DateTimeOffset.UtcNow < token.TokenExpiry)
            return token.AccessToken;

        if (string.IsNullOrEmpty(token.RefreshToken))
            return token.AccessToken;

        var clientId = GetConfigVar("GOOGLE_CLIENT_ID");
        var clientSecret = GetConfigVar("GOOGLE_CLIENT_SECRET");

        var client = httpClientFactory.CreateClient();
        var resp = await client.PostAsync(
            "https://oauth2.googleapis.com/token",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "refresh_token",
                ["refresh_token"] = token.RefreshToken,
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret
            }));

        if (!resp.IsSuccessStatusCode) return token.AccessToken;

        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        var root = doc.RootElement;
        token.AccessToken = root.GetProperty("access_token").GetString() ?? token.AccessToken;
        token.TokenExpiry = DateTimeOffset.UtcNow.AddSeconds(root.GetProperty("expires_in").GetInt32() - 60);
        await db.SaveChangesAsync();

        return token.AccessToken;
    }

    private Guid GetMemberId() => HttpContext.GetCurrentMemberId();

    private string GetConfigVar(string key)
        => db.ConfigVariables.Where(v => v.Key == key).Select(v => v.Value).FirstOrDefault() ?? "";

    private string GetRedirectUri()
    {
        var custom = GetConfigVar("GOOGLE_REDIRECT_URI");
        if (!string.IsNullOrEmpty(custom)) return custom;
        var req = httpContextAccessor.HttpContext?.Request;
        return req != null ? $"{req.Scheme}://{req.Host}/api/v1/integrations/google-calendar/callback" : "";
    }
}
