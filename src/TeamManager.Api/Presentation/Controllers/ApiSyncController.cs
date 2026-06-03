using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/sync-queue")]
[Authorize]
public class ApiSyncController(AppDbContext db, IHttpClientFactory httpClientFactory) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status = null, [FromQuery] string? action = null)
    {
        var q = db.ApiSyncEvents.OrderByDescending(e => e.CreatedAt).AsQueryable();

        if (!string.IsNullOrEmpty(status)) q = q.Where(e => e.Status == status);
        if (!string.IsNullOrEmpty(action)) q = q.Where(e => e.Action == action);

        var events = await q.Take(200).Select(e => new
        {
            e.Id, e.Action, e.ConfigName, e.Label,
            e.SourceId, e.SourceType, e.Status,
            e.ResolvedUrl,
            ResolvedHeaders = JsonSerializer.Deserialize<Dictionary<string, string>>(e.ResolvedHeadersJson, (JsonSerializerOptions?)null),
            e.ResolvedBody, e.BodyFormat,
            e.ExternalId, e.ResponseStatus, e.ResponseBody,
            e.CreatedAt, e.SentAt
        }).ToListAsync();

        return Ok(events);
    }

    [HttpPost("{id:guid}/send")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Send(Guid id, [FromBody] SyncSendPayload payload)
    {
        var evt = await db.ApiSyncEvents.FindAsync(id);
        if (evt is null) return NotFound();

        var cookie = payload.Cookie ?? "";
        string Inject(string s) => s.Replace("{cookie}", cookie);

        var rawHeaders = JsonSerializer.Deserialize<Dictionary<string, string>>(evt.ResolvedHeadersJson) ?? [];
        var headers = rawHeaders.ToDictionary(kvp => kvp.Key, kvp => Inject(kvp.Value));
        var body = Inject(evt.ResolvedBody);
        var url = Inject(evt.ResolvedUrl);

        try
        {
            var client = httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(30);
            foreach (var (k, v) in headers)
                client.DefaultRequestHeaders.TryAddWithoutValidation(k, v);

            HttpResponseMessage response;
            if (evt.BodyFormat == "raw")
            {
                var content = new StringContent(body);
                content.Headers.ContentType = null;
                response = await client.PostAsync(url, content);
            }
            else
            {
                var mediaType = evt.BodyFormat == "urlencoded" ? "application/x-www-form-urlencoded" : "application/json";
                var content = new StringContent(body, System.Text.Encoding.UTF8, mediaType);
                response = await client.PostAsync(url, content);
            }

            var responseBody = await response.Content.ReadAsStringAsync();
            evt.Status = response.IsSuccessStatusCode ? "sent" : "failed";
            evt.ResponseStatus = (int)response.StatusCode;
            evt.ResponseBody = responseBody;
            evt.SentAt = DateTimeOffset.UtcNow;

            if (response.IsSuccessStatusCode)
                evt.ExternalId = await TryExtractExternalId(evt.Action, responseBody);

            if (evt.ExternalId != null && evt.SourceType == "TimesheetEntry" &&
                Guid.TryParse(evt.SourceId, out var entryId))
            {
                var entry = await db.TimesheetEntries.FindAsync(entryId);
                if (entry != null) entry.ExternalId = evt.ExternalId;
            }

            await db.SaveChangesAsync();
            return Ok(new { evt.Status, evt.ResponseStatus, evt.ResponseBody, evt.ExternalId });
        }
        catch (Exception ex)
        {
            evt.Status = "failed";
            evt.ResponseBody = ex.Message;
            evt.SentAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
            return Ok(new { Status = "failed", ResponseStatus = (int?)null, ResponseBody = ex.Message, ExternalId = (string?)null });
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Dismiss(Guid id)
    {
        var evt = await db.ApiSyncEvents.FindAsync(id);
        if (evt is null) return NotFound();
        evt.Status = "dismissed";
        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<string?> TryExtractExternalId(string action, string responseBody)
    {
        try
        {
            var config = await db.ApiRequestConfigs
                .Where(c => c.Action == action && c.Enabled)
                .Select(c => c.MappingJson)
                .FirstOrDefaultAsync();

            if (config is null) return null;

            using var mappingDoc = JsonDocument.Parse(config);
            if (!mappingDoc.RootElement.TryGetProperty("externalIdPath", out var pathEl)) return null;

            var path = pathEl.GetString() ?? "";
            if (string.IsNullOrEmpty(path)) return null;

            using var responseDoc = JsonDocument.Parse(responseBody);
            var current = responseDoc.RootElement;
            foreach (var part in path.Split('.'))
                if (!current.TryGetProperty(part, out current)) return null;

            var val = current.ToString();
            return string.IsNullOrEmpty(val) ? null : val;
        }
        catch { return null; }
    }
}

public record SyncSendPayload(string? Cookie = null);
