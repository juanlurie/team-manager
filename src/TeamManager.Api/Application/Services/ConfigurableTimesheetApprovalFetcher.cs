using System.Net.Http.Headers;
using System.Text.Json;
using TeamManager.Api.Application.DTOs;
using TeamManager.Api.Application.DTOs.Timesheet;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace TeamManager.Api.Application.Services;

public class ConfigurableTimesheetApprovalFetcher : ITimesheetApprovalFetcher
{
    private readonly AppDbContext _db;

    public ConfigurableTimesheetApprovalFetcher(AppDbContext db) => _db = db;

    public async Task<TimesheetFetchResult> FetchAsync(FetchTimesheetApprovalsRequest request)
    {
        var config = await _db.ApiRequestConfigs.FirstOrDefaultAsync(c => c.Action == "FetchTimesheetApprovals");
        if (config is null)
            throw new InvalidOperationException("Timesheet approval fetching is not configured. Add a 'Fetch Timesheet Approvals' action in Integrations.");
        if (!config.Enabled)
            throw new InvalidOperationException("Timesheet approval fetching is disabled. Enable it in Integrations.");

        var headers = JsonSerializer.Deserialize<Dictionary<string, string>>(config.HeadersJson) ?? new();
        var mapping = JsonSerializer.Deserialize<MappingConfigDto>(config.MappingJson) ?? new MappingConfigDto();
        var publicConfigVars = await ConfigVariableResolver.LoadPublicAsync(_db);
        var allConfigVars = await ConfigVariableResolver.LoadAsync(_db);

        // Falls back to the integration's stored cookie (captured via the browser extension) when
        // the caller didn't supply one — same convention as ApiSyncController's send flow.
        var cookie = !string.IsNullOrWhiteSpace(request.Cookie) ? request.Cookie : (config.StoredCookie ?? "");

        var credentials = request.Credentials ?? new();

        // Storage values are non-secret and deliberately leave {cookie} and any named credential
        // placeholders (e.g. {authCookie}) unresolved, so session tokens are never written to
        // the ApiSyncEvent row that this fetch logs (see below).
        string ResolveForStorage(string t) =>
            ResolveTemplate(ConfigVariableResolver.Apply(t, publicConfigVars), request.Start, request.End, "{cookie}");
        string ResolveForExecution(string t)
        {
            var result = ResolveTemplate(ConfigVariableResolver.Apply(t, allConfigVars), request.Start, request.End, cookie);
            foreach (var (key, value) in credentials)
                result = result.Replace($"{{{key}}}", value);
            return result;
        }

        // Every outbound integration call must be visible in the Sync Queue — log it before
        // executing, then update its status/response once the call completes.
        var evt = new ApiSyncEvent
        {
            Action = config.Action,
            ConfigName = config.Name,
            Label = $"Fetch Timesheet Approvals — {request.Start} to {request.End}",
            SourceType = "TimesheetApprovalFetch",
            HttpMethod = config.Method.ToUpper(),
            ResolvedUrl = ResolveForStorage(config.Url),
            ResolvedHeadersJson = JsonSerializer.Serialize(headers.ToDictionary(kvp => kvp.Key, kvp => ResolveForStorage(kvp.Value))),
            ResolvedBody = ResolveForStorage(config.BodyTemplate),
            BodyFormat = config.IsFormUrlEncoded ? "urlencoded" : "json",
            Status = "pending"
        };
        _db.ApiSyncEvents.Add(evt);
        await _db.SaveChangesAsync();

        var client = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
        client.DefaultRequestHeaders.Accept.ParseAdd("application/json, text/javascript, */*; q=0.01");

        foreach (var (key, value) in headers)
            client.DefaultRequestHeaders.Add(key, ResolveForExecution(value));

        var secretHeaders = JsonSerializer.Deserialize<Dictionary<string, string>>(
            string.IsNullOrWhiteSpace(config.SecretHeadersJson) ? "{}" : config.SecretHeadersJson) ?? new();
        foreach (var (k, v) in secretHeaders)
            client.DefaultRequestHeaders.TryAddWithoutValidation(k, v);

        var url = ResolveForExecution(config.Url);
        string json;

        try
        {
            HttpResponseMessage response;
            if (config.Method.Equals("POST", StringComparison.OrdinalIgnoreCase))
            {
                var body = ResolveForExecution(config.BodyTemplate);
                var content = new StringContent(body);
                content.Headers.ContentType = new MediaTypeHeaderValue(
                    config.IsFormUrlEncoded ? "application/x-www-form-urlencoded" : "application/json");
                response = await client.PostAsync(url, content);
            }
            else
            {
                response = await client.GetAsync(url);
            }

            json = await response.Content.ReadAsStringAsync();
            evt.ResponseStatus = (int)response.StatusCode;
            // Stored in full (not truncated) — the Sync Queue UI offers a download for events
            // too large to read comfortably inline rather than discarding data here.
            evt.ResponseBody = json;
            evt.SentAt = DateTimeOffset.UtcNow;

            if (!response.IsSuccessStatusCode)
            {
                evt.Status = "failed";
                await _db.SaveChangesAsync();
                throw new InvalidOperationException($"External API returned {(int)response.StatusCode}.");
            }

            evt.Status = "sent";
            await _db.SaveChangesAsync();
        }
        catch (Exception ex) when (ex is not InvalidOperationException)
        {
            evt.Status = "failed";
            evt.ResponseBody = ex.Message;
            evt.SentAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync();
            throw new InvalidOperationException($"Failed to reach the timesheet system: {ex.Message}");
        }

        var root = JsonDocument.Parse(json).RootElement;

        JsonElement topArray;
        if (!string.IsNullOrWhiteSpace(mapping.ArrayPath))
        {
            topArray = NavigatePath(root, ParsePath(mapping.ArrayPath));
            if (topArray.ValueKind != JsonValueKind.Array)
                throw new InvalidOperationException($"Array path '{mapping.ArrayPath}' does not resolve to an array.");
        }
        else if (root.ValueKind == JsonValueKind.Array)
        {
            topArray = root;
        }
        else
        {
            throw new InvalidOperationException("Response is not a JSON array and no array path is configured.");
        }

        var entries = new List<ImportedTimesheetEntry>();
        var employeeNames = new List<string>();
        var presentDays = new List<MemberDay>();
        var employeeTeams = new Dictionary<string, string>();
        foreach (var group in topArray.EnumerateArray())
        {
            var teamName = string.IsNullOrWhiteSpace(mapping.TeamNamePath) ? "" : GetProperty(group, mapping.TeamNamePath);
            foreach (var employee in EnumerateLevel(group, mapping.EmployeesPath))
            {
                var memberName = GetProperty(employee, mapping.MemberNamePath);
                if (!string.IsNullOrWhiteSpace(memberName))
                {
                    employeeNames.Add(memberName);
                    if (!string.IsNullOrWhiteSpace(teamName))
                        employeeTeams[memberName] = teamName;
                }
                foreach (var day in EnumerateLevel(employee, mapping.DaysArrayPath))
                {
                    // A day present in the response — even with no entries — is still
                    // outstanding; one absent entirely was already signed off elsewhere.
                    if (!string.IsNullOrWhiteSpace(mapping.DayDatePath) && !string.IsNullOrWhiteSpace(memberName))
                    {
                        var dayDateStr = GetProperty(day, mapping.DayDatePath);
                        if (!string.IsNullOrWhiteSpace(dayDateStr))
                            presentDays.Add(new MemberDay(memberName, ParseDate(dayDateStr)));
                    }

                    foreach (var entry in EnumerateLevel(day, mapping.EntriesPath))
                    {
                        entries.Add(ToEntry(entry, mapping, memberName));
                    }
                }
            }
        }
        return new TimesheetFetchResult(entries, employeeNames.Distinct().ToList(), presentDays, employeeTeams);
    }

    // Navigates to the array at `path` (relative to `element`) and yields its items.
    // If `path` is empty, treats `element` itself as the single item at this level —
    // this is what makes each nesting level optional, so a flat array of entries with
    // no team/employee/day grouping still works (see class remarks above).
    private static IEnumerable<JsonElement> EnumerateLevel(JsonElement element, string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            yield return element;
            yield break;
        }

        var resolved = NavigatePath(element, ParsePath(path));
        if (resolved.ValueKind != JsonValueKind.Array)
            yield break;

        foreach (var item in resolved.EnumerateArray())
            yield return item;
    }

    private static ImportedTimesheetEntry ToEntry(JsonElement r, MappingConfigDto mapping, string memberName)
    {
        var dateStr = GetProperty(r, mapping.DatePath);
        var project = GetProperty(r, mapping.ProjectPath);
        var category = GetProperty(r, mapping.CategoryPath);
        var hoursStr = GetProperty(r, mapping.HoursPath);
        var minutesStr = GetProperty(r, mapping.MinutesPath);
        var billableStr = GetProperty(r, mapping.BillablePath);
        var workedFrom = GetProperty(r, mapping.WorkedFromPath);
        var description = GetProperty(r, mapping.DescriptionPath);
        var ticketNumber = GetProperty(r, mapping.TicketNumberPath);
        var externalId = GetProperty(r, mapping.ExternalIdPath);

        return new ImportedTimesheetEntry(
            memberName,
            ParseDate(dateStr),
            project,
            category,
            int.TryParse(hoursStr, out var hours) ? hours : 0,
            int.TryParse(minutesStr, out var minutes) ? minutes : 0,
            bool.TryParse(billableStr, out var billable) && billable,
            workedFrom,
            string.IsNullOrEmpty(description) ? null : description,
            string.IsNullOrEmpty(ticketNumber) ? null : ticketNumber,
            string.IsNullOrEmpty(externalId) ? null : externalId
        );
    }

    // Handles plain dates ("2026-06-01"), as well as the "yyyy/MM/dd HH:mm:ss"
    // format some external timesheet systems use for entry-level dates.
    private static DateOnly ParseDate(string dateStr)
    {
        if (DateOnly.TryParse(dateStr, out var date)) return date;
        if (DateTime.TryParse(dateStr, out var dateTime)) return DateOnly.FromDateTime(dateTime);
        return DateOnly.MinValue;
    }

    private static string ResolveTemplate(string template, string start, string end, string cookie)
    {
        return template
            .Replace("{cookie}", cookie)
            .Replace("{start}", start)
            .Replace("{end}", end);
    }

    private static string GetProperty(JsonElement element, string path)
    {
        if (string.IsNullOrEmpty(path)) return "";
        var current = NavigatePath(element, ParsePath(path));
        if (current.ValueKind == JsonValueKind.Undefined) return "";
        return current.ValueKind == JsonValueKind.String ? current.GetString() ?? "" : current.GetRawText();
    }

    private static JsonElement NavigatePath(JsonElement element, List<string> segments)
    {
        var current = element;
        foreach (var segment in segments)
        {
            if (current.ValueKind == JsonValueKind.Object)
            {
                if (current.TryGetProperty(segment, out var next))
                {
                    current = next;
                    continue;
                }

                // External APIs are inconsistent about casing (e.g. "Description" vs the
                // mapping's default "description") — fall back to a case-insensitive match
                // rather than silently resolving to an empty value.
                var match = current.EnumerateObject()
                    .FirstOrDefault(p => string.Equals(p.Name, segment, StringComparison.OrdinalIgnoreCase));
                if (match.Value.ValueKind == JsonValueKind.Undefined) return default;
                current = match.Value;
            }
            else if (current.ValueKind == JsonValueKind.Array)
            {
                if (int.TryParse(segment, out var index) && index < current.GetArrayLength()) current = current[index];
                else return default;
            }
            else
            {
                return default;
            }
        }
        return current;
    }

    private static List<string> ParsePath(string path)
    {
        var segments = new List<string>();
        var current = "";
        var i = 0;

        while (i < path.Length)
        {
            if (path[i] == '.')
            {
                if (!string.IsNullOrEmpty(current)) { segments.Add(current); current = ""; }
                i++;
            }
            else if (path[i] == '[')
            {
                if (!string.IsNullOrEmpty(current)) { segments.Add(current); current = ""; }
                i++;
                var bracketEnd = path.IndexOf(']', i);
                if (bracketEnd > i) { segments.Add(path.Substring(i, bracketEnd - i)); i = bracketEnd + 1; }
                else break;
            }
            else
            {
                current += path[i];
                i++;
            }
        }

        if (!string.IsNullOrEmpty(current)) segments.Add(current);
        return segments;
    }
}
