using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/sync-queue")]
[Authorize]
public class ApiSyncController(AppDbContext db, IHttpClientFactory httpClientFactory) : ControllerBase
{
    [HttpGet("check/{actionName}")]
    public async Task<IActionResult> CheckEnabled(string actionName)
    {
        var enabled = await db.ApiRequestConfigs.AnyAsync(c => c.Action == actionName && c.Enabled);
        return Ok(new { enabled });
    }

    [HttpPost("enqueue")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Enqueue([FromBody] EnqueuePayload payload)
    {
        var config = await db.ApiRequestConfigs
            .FirstOrDefaultAsync(c => c.Action == payload.Action && c.Enabled);

        if (config is null)
            return BadRequest($"No enabled config found for action '{payload.Action}'");

        var parameters = JsonSerializer.Deserialize<Dictionary<string, string>>(
            string.IsNullOrWhiteSpace(config.ParametersJson) ? "{}" : config.ParametersJson) ?? [];
        var headers = JsonSerializer.Deserialize<Dictionary<string, string>>(config.HeadersJson) ?? [];
        var cookie = config.StoredCookie ?? "{cookie}";

        // Auto-resolve member-specific template vars when source is a TimesheetEntry
        if (payload.SourceType == "TimesheetEntry" && Guid.TryParse(payload.SourceId, out var sourceEntryId))
        {
            var entry = await db.TimesheetEntries.FindAsync(sourceEntryId);
            if (entry is not null)
            {
                var memberCfg = await db.MemberTimesheetConfigs.FindAsync(entry.TeamMemberId);
                if (memberCfg is not null)
                {
                    if (!string.IsNullOrWhiteSpace(memberCfg.ExternalEmployeeId))
                        parameters["employeeId"] = memberCfg.ExternalEmployeeId;

                    var catIds = JsonSerializer.Deserialize<Dictionary<string, string>>(
                        string.IsNullOrWhiteSpace(memberCfg.CategoryCorrelationIdsJson) ? "{}" : memberCfg.CategoryCorrelationIdsJson,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
                    if (catIds.TryGetValue(entry.Category, out var catId))
                        parameters["categoryId"] = catId;

                    var locIds = JsonSerializer.Deserialize<Dictionary<string, string>>(
                        string.IsNullOrWhiteSpace(memberCfg.WorkLocationCorrelationIdsJson) ? "{}" : memberCfg.WorkLocationCorrelationIdsJson,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
                    if (!string.IsNullOrWhiteSpace(entry.WorkedFrom) && locIds.TryGetValue(entry.WorkedFrom, out var locId))
                        parameters["workedFromLocationId"] = locId;
                }
            }
        }

        string Resolve(string t)
        {
            var result = t.Replace("{cookie}", cookie);
            foreach (var (key, value) in parameters)
                result = result.Replace($"{{{key}}}", value);
            foreach (var (key, value) in payload.Variables ?? new())
                result = result.Replace($"{{{key}}}", value);
            return result;
        }

        var resolvedHeaders = headers.ToDictionary(kvp => kvp.Key, kvp => Resolve(kvp.Value));

        var evt = new Domain.Entities.ApiSyncEvent
        {
            Action = payload.Action,
            ConfigName = config.Name,
            Label = payload.Label ?? payload.Action,
            SourceType = payload.SourceType ?? "",
            SourceId = payload.SourceId,
            HttpMethod = config.Method.ToUpper(),
            ResolvedUrl = Resolve(config.Url),
            ResolvedHeadersJson = JsonSerializer.Serialize(resolvedHeaders),
            ResolvedBody = Resolve(config.BodyTemplate),
            BodyFormat = config.BodyFormat ?? "urlencoded"
        };

        db.ApiSyncEvents.Add(evt);
        await db.SaveChangesAsync();

        if (config.AutoSync)
        {
            var (status, responseStatus, responseBody, externalId) = await ExecuteSendAsync(evt, config.StoredCookie ?? "");
            await PruneOldEventsAsync();
            return Ok(new { evt.Id, evt.Action, evt.Label, Status = status, AutoSynced = true, responseStatus, responseBody });
        }

        return Ok(new { evt.Id, evt.Action, evt.Label, evt.Status, AutoSynced = false });
    }

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
            e.HttpMethod, e.ResolvedUrl,
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
        var (status, responseStatus, responseBody, externalId) = await ExecuteSendAsync(evt, payload.Cookie ?? "");
        await PruneOldEventsAsync();
        return Ok(new { status, responseStatus, responseBody, externalId });
    }

    [HttpPost("send-all")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> SendAll([FromBody] SyncSendPayload payload)
    {
        var cookie = payload.Cookie ?? "";
        var pending = await db.ApiSyncEvents
            .Where(e => e.Status == "pending" || e.Status == "failed")
            .OrderBy(e => e.CreatedAt)
            .ToListAsync();

        var sent = 0; var failed = 0;
        foreach (var evt in pending)
        {
            var result = await ExecuteSendAsync(evt, cookie);
            if (result.Status == "sent") sent++; else failed++;
        }
        await PruneOldEventsAsync();
        return Ok(new { sent, failed, total = pending.Count });
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

    private async Task PruneOldEventsAsync()
    {
        var cutoff = DateTimeOffset.UtcNow.AddDays(-7);
        await db.ApiSyncEvents.Where(e => e.CreatedAt < cutoff).ExecuteDeleteAsync();
    }

    private async Task<(string Status, int? ResponseStatus, string? ResponseBody, string? ExternalId)> ExecuteSendAsync(Domain.Entities.ApiSyncEvent evt, string cookie)
    {
        var lateVars = new Dictionary<string, string>();
        if (evt.SourceType == "TimesheetEntry" && Guid.TryParse(evt.SourceId, out var lateEntryId))
        {
            var entry = await db.TimesheetEntries.FindAsync(lateEntryId);
            if (entry is not null)
            {
                var memberCfg = await db.MemberTimesheetConfigs.FindAsync(entry.TeamMemberId);
                if (memberCfg is not null)
                {
                    var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                    if (!string.IsNullOrWhiteSpace(memberCfg.ExternalEmployeeId))
                        lateVars["employeeId"] = memberCfg.ExternalEmployeeId;
                    var catIds = JsonSerializer.Deserialize<Dictionary<string, string>>(
                        string.IsNullOrWhiteSpace(memberCfg.CategoryCorrelationIdsJson) ? "{}" : memberCfg.CategoryCorrelationIdsJson, opts) ?? [];
                    if (catIds.TryGetValue(entry.Category, out var catId))
                        lateVars["categoryId"] = catId;
                    var locIds = JsonSerializer.Deserialize<Dictionary<string, string>>(
                        string.IsNullOrWhiteSpace(memberCfg.WorkLocationCorrelationIdsJson) ? "{}" : memberCfg.WorkLocationCorrelationIdsJson, opts) ?? [];
                    if (!string.IsNullOrWhiteSpace(entry.WorkedFrom) && locIds.TryGetValue(entry.WorkedFrom, out var locId))
                        lateVars["workedFromLocationId"] = locId;
                }
                if (!string.IsNullOrWhiteSpace(entry.ExternalId))
                    lateVars["timesheetEntryId"] = entry.ExternalId;
            }
            else
            {
                var resolvedExternalId = evt.ExternalId;
                if (string.IsNullOrWhiteSpace(resolvedExternalId))
                {
                    var addEvent = await db.ApiSyncEvents
                        .Where(e => e.SourceId == evt.SourceId && e.Action == "AddTimesheetEntry" && e.ExternalId != null)
                        .OrderByDescending(e => e.SentAt)
                        .FirstOrDefaultAsync();
                    resolvedExternalId = addEvent?.ExternalId;
                }
                if (!string.IsNullOrWhiteSpace(resolvedExternalId))
                    lateVars["timesheetEntryId"] = resolvedExternalId;
            }
        }

        // Load success criteria, retry count, and stored cookie from the config
        var configMeta = await db.ApiRequestConfigs
            .Where(c => c.Action == evt.Action && c.Enabled)
            .Select(c => new { c.RetryCount, c.SuccessCriteriaJson, c.StoredCookie })
            .FirstOrDefaultAsync();
        var retryCount = configMeta?.RetryCount ?? 0;
        SuccessCriteriaDto? criteria = null;
        if (!string.IsNullOrWhiteSpace(configMeta?.SuccessCriteriaJson))
            criteria = JsonSerializer.Deserialize<SuccessCriteriaDto>(configMeta.SuccessCriteriaJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        var rawHeaders = JsonSerializer.Deserialize<Dictionary<string, string>>(evt.ResolvedHeadersJson) ?? [];

        // Only enforce cookie requirement if the resolved payload still references it
        var needsCookie = evt.ResolvedBody.Contains("{cookie}")
            || evt.ResolvedUrl.Contains("{cookie}")
            || evt.ResolvedHeadersJson.Contains("{cookie}");

        for (var attempt = 0; attempt <= retryCount; attempt++)
        {
            try
            {
                // On retries, re-read StoredCookie from DB — the extension may have refreshed it
                string activeCookie = cookie;
                if (attempt > 0)
                {
                    var freshCookie = await db.ApiRequestConfigs
                        .Where(c => c.Action == evt.Action && c.Enabled)
                        .Select(c => c.StoredCookie)
                        .FirstOrDefaultAsync();
                    if (!string.IsNullOrWhiteSpace(freshCookie))
                        activeCookie = freshCookie;
                }
                else if (string.IsNullOrWhiteSpace(activeCookie) && !string.IsNullOrWhiteSpace(configMeta?.StoredCookie))
                {
                    activeCookie = configMeta.StoredCookie;
                }

                if (needsCookie && string.IsNullOrWhiteSpace(activeCookie))
                {
                    evt.Status = "failed";
                    evt.ResponseBody = "No cookie available — capture it via the browser extension first.";
                    evt.SentAt = DateTimeOffset.UtcNow;
                    await db.SaveChangesAsync();
                    return ("failed", null, evt.ResponseBody, null);
                }

                string Inject(string s)
                {
                    var result = s.Replace("{cookie}", activeCookie);
                    foreach (var (key, value) in lateVars)
                        result = result.Replace($"{{{key}}}", value);
                    return result;
                }

                var headers = rawHeaders.ToDictionary(kvp => kvp.Key, kvp => Inject(kvp.Value));
                var body = Inject(evt.ResolvedBody);
                var url = Inject(evt.ResolvedUrl);

                var client = httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(30);
                foreach (var (k, v) in headers)
                    client.DefaultRequestHeaders.TryAddWithoutValidation(k, v);

                HttpResponseMessage response;
                if (evt.HttpMethod == "GET")
                    response = await client.GetAsync(url);
                else if (evt.BodyFormat == "raw")
                {
                    var content = new StringContent(body);
                    content.Headers.ContentType = null;
                    response = await client.PostAsync(url, content);
                }
                else
                {
                    var mediaType = evt.BodyFormat == "urlencoded" ? "application/x-www-form-urlencoded" : "application/json";
                    response = await client.PostAsync(url, new StringContent(body, System.Text.Encoding.UTF8, mediaType));
                }

                var responseBody = await response.Content.ReadAsStringAsync();
                var success = IsSuccess(response, responseBody, criteria);

                evt.ResponseStatus = (int)response.StatusCode;
                evt.ResponseBody = responseBody;
                evt.SentAt = DateTimeOffset.UtcNow;

                if (success)
                {
                    evt.Status = "sent";
                    evt.ExternalId = await TryExtractExternalId(evt.Action, responseBody);
                    if (evt.SourceType == "TimesheetEntry" && Guid.TryParse(evt.SourceId, out var entryId))
                    {
                        var entry = await db.TimesheetEntries.FindAsync(entryId);
                        if (entry != null && evt.ExternalId != null) entry.ExternalId = evt.ExternalId;
                    }
                    if (evt.SourceType == "WinWeek" && Guid.TryParse(evt.SourceId, out var weekId))
                    {
                        var story = await TryExtractWinStoryAsync(evt.Action, responseBody);
                        if (!string.IsNullOrWhiteSpace(story))
                        {
                            var winWeek = await db.WinWeeks.FindAsync(weekId);
                            if (winWeek is not null)
                                winWeek.WinnerStory = story.Trim();
                        }
                    }
                    await TryUpdateProjectsFromResponseAsync(responseBody, evt.Action, evt.SourceId);
                    await db.SaveChangesAsync();
                    return (evt.Status, evt.ResponseStatus, evt.ResponseBody, evt.ExternalId);
                }

                // Failed — retry if attempts remain
                evt.Status = "failed";
                if (attempt < retryCount)
                    await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt))); // 1s, 2s, 4s…
            }
            catch (Exception ex)
            {
                evt.Status = "failed";
                evt.ResponseBody = ex.Message;
                evt.SentAt = DateTimeOffset.UtcNow;
                if (attempt >= retryCount) { await db.SaveChangesAsync(); return ("failed", null, ex.Message, null); }
                await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)));
            }
        }

        await db.SaveChangesAsync();
        return (evt.Status, evt.ResponseStatus, evt.ResponseBody, evt.ExternalId);
    }

    private static bool IsSuccess(HttpResponseMessage response, string responseBody, SuccessCriteriaDto? criteria)
    {
        if (criteria is null) return response.IsSuccessStatusCode;
        if (criteria.RequiredStatus.HasValue && (int)response.StatusCode != criteria.RequiredStatus.Value) return false;
        else if (!criteria.RequiredStatus.HasValue && !response.IsSuccessStatusCode) return false;
        if (!string.IsNullOrWhiteSpace(criteria.JsonPath))
        {
            try
            {
                using var doc = JsonDocument.Parse(responseBody);
                var el = doc.RootElement;
                foreach (var part in criteria.JsonPath.Split('.'))
                    if (!el.TryGetProperty(part, out el)) return false;
                if (!string.IsNullOrWhiteSpace(criteria.JsonValue))
                {
                    var actual = el.ValueKind == JsonValueKind.String
                        ? el.GetString() ?? ""
                        : el.GetRawText();
                    return actual.Equals(criteria.JsonValue, StringComparison.OrdinalIgnoreCase);
                }
            }
            catch { return false; }
        }
        return true;
    }

    private async Task TryUpdateProjectsFromResponseAsync(string responseBody, string action, string? sourceMemberId)
    {
        try
        {
            var mappingJson = await db.ApiRequestConfigs
                .Where(c => c.Action == action && c.Enabled)
                .Select(c => c.MappingJson)
                .FirstOrDefaultAsync();

            if (mappingJson is null) return;

            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var mapping = JsonSerializer.Deserialize<MappingConfigDto>(mappingJson, opts) ?? new();

            // Only process if configured for project sync
            if (string.IsNullOrWhiteSpace(mapping.ProjectNamePath)) return;

            // Extract the JSON array — from raw JSON or from embedded HTML
            JsonElement projectsEl;
            string rawForEmployeeId = responseBody;

            if (mapping.ResponseFormat == "html")
            {
                var marker = string.IsNullOrWhiteSpace(mapping.HtmlJsonMarker) ? "[" : mapping.HtmlJsonMarker;
                var markerIdx = responseBody.IndexOf(marker, StringComparison.Ordinal);
                if (markerIdx < 0) return;

                var arrayStart = responseBody.IndexOf('[', markerIdx);
                if (arrayStart < 0) return;

                var depth = 0;
                var arrayEnd = -1;
                for (var i = arrayStart; i < responseBody.Length; i++)
                {
                    if (responseBody[i] == '[') depth++;
                    else if (responseBody[i] == ']') { depth--; if (depth == 0) { arrayEnd = i; break; } }
                }
                if (arrayEnd < 0) return;

                var arrayJson = responseBody[arrayStart..(arrayEnd + 1)];
                using var htmlDoc = JsonDocument.Parse(arrayJson);
                projectsEl = htmlDoc.RootElement.Clone();
            }
            else
            {
                using var jsonDoc = JsonDocument.Parse(responseBody);
                var root = jsonDoc.RootElement;
                projectsEl = string.IsNullOrWhiteSpace(mapping.ProjectsPath)
                    ? root.Clone()
                    : NavigatePath(root, mapping.ProjectsPath).Clone();
            }

            if (projectsEl.ValueKind != JsonValueKind.Array) return;

            var projects = new List<string>();
            var categories = new Dictionary<string, List<string>>();
            var correlationIds = new Dictionary<string, string>();

            foreach (var proj in projectsEl.EnumerateArray())
            {
                var projName = GetStringAt(proj, mapping.ProjectNamePath);
                if (string.IsNullOrWhiteSpace(projName)) continue;

                projects.Add(projName);

                var projId = GetStringAt(proj, mapping.ProjectIdPath);
                if (!string.IsNullOrWhiteSpace(projId))
                    correlationIds[projName] = projId;

                if (!string.IsNullOrWhiteSpace(mapping.ProjectCategoriesPath))
                {
                    var catsEl = NavigatePath(proj, mapping.ProjectCategoriesPath);
                    if (catsEl.ValueKind == JsonValueKind.Array)
                    {
                        var catList = new List<string>();
                        foreach (var cat in catsEl.EnumerateArray())
                        {
                            var catName = GetStringAt(cat, mapping.CategoryNamePath);
                            if (string.IsNullOrWhiteSpace(catName)) continue;
                            catList.Add(catName);
                            var catId = GetStringAt(cat, mapping.CategoryIdPath);
                            if (!string.IsNullOrWhiteSpace(catId))
                                correlationIds[catName] = catId;
                        }
                        if (catList.Count > 0) categories[projName] = catList;
                    }
                }
            }

            var sysConfig = await db.TimesheetSystemConfigs.FindAsync(1);
            if (sysConfig is null)
            {
                sysConfig = new Domain.Entities.TimesheetSystemConfig();
                db.TimesheetSystemConfigs.Add(sysConfig);
            }
            sysConfig.DefaultProjectsJson = JsonSerializer.Serialize(projects);
            sysConfig.DefaultCategoriesJson = JsonSerializer.Serialize(categories);
            sysConfig.CorrelationIdsJson = JsonSerializer.Serialize(correlationIds);
            sysConfig.UpdatedAt = DateTimeOffset.UtcNow;

            // Copy correlation IDs to the source member's config if a member was specified
            if (Guid.TryParse(sourceMemberId, out var memberId))
            {
                var memberConfig = await db.MemberTimesheetConfigs.FindAsync(memberId);
                if (memberConfig is null)
                {
                    memberConfig = new Domain.Entities.MemberTimesheetConfig { TeamMemberId = memberId };
                    db.MemberTimesheetConfigs.Add(memberConfig);
                }
                memberConfig.CategoryCorrelationIdsJson = JsonSerializer.Serialize(correlationIds);

                // Extract external employee ID if a pattern is configured
                if (!string.IsNullOrWhiteSpace(mapping.EmployeeIdPattern))
                {
                    var empMatch = Regex.Match(rawForEmployeeId, mapping.EmployeeIdPattern);
                    if (empMatch.Success)
                    {
                        var empId = empMatch.Groups.Count > 1 ? empMatch.Groups[1].Value : empMatch.Value;
                        memberConfig.ExternalEmployeeId = empId;
                    }
                }
            }

            await db.SaveChangesAsync();
        }
        catch { /* don't fail the send */ }
    }

    private static JsonElement NavigatePath(JsonElement root, string path)
    {
        var current = root;
        foreach (var part in path.Split('.'))
        {
            if (int.TryParse(part, out var idx))
            {
                if (current.ValueKind != JsonValueKind.Array || idx >= current.GetArrayLength()) return default;
                current = current[idx];
            }
            else if (!current.TryGetProperty(part, out current))
            {
                return default;
            }
        }
        return current;
    }

    private static string? GetStringAt(JsonElement el, string path)
    {
        if (string.IsNullOrWhiteSpace(path)) return null;
        var target = NavigatePath(el, path);
        return target.ValueKind == JsonValueKind.Undefined ? null : target.ToString();
    }

    private async Task<string?> TryExtractWinStoryAsync(string action, string responseBody)
    {
        try
        {
            var mappingJson = await db.ApiRequestConfigs
                .Where(c => c.Action == action && c.Enabled)
                .Select(c => c.MappingJson)
                .FirstOrDefaultAsync();
            if (string.IsNullOrWhiteSpace(mappingJson)) return null;

            using var mappingDoc = JsonDocument.Parse(mappingJson);
            if (!mappingDoc.RootElement.TryGetProperty("textResponsePath", out var pathEl)) return null;
            var path = pathEl.GetString() ?? "";
            if (string.IsNullOrEmpty(path)) return null;

            var el = NavigatePath(JsonDocument.Parse(responseBody).RootElement, path);
            return el.ValueKind == JsonValueKind.String ? el.GetString() : null;
        }
        catch { return null; }
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
            if (!mappingDoc.RootElement.TryGetProperty("ExternalIdPath", out var pathEl)) return null;

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
public record EnqueuePayload(
    string Action,
    string? Label = null,
    string? SourceId = null,
    string? SourceType = null,
    Dictionary<string, string>? Variables = null
);
