using System.Net.Http.Headers;
using System.Text.Json;
using TeamManager.Api.Application.DTOs;
using TeamManager.Api.Application.DTOs.Timesheet;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace TeamManager.Api.Application.Services;

public class ConfigurableTimesheetApprovalFetcher : ITimesheetApprovalFetcher
{
    private readonly AppDbContext _db;

    public ConfigurableTimesheetApprovalFetcher(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<ImportedTimesheetEntry>> FetchAsync(FetchTimesheetApprovalsRequest request)
    {
        var config = await _db.ApiRequestConfigs.FirstOrDefaultAsync(c => c.Action == "FetchTimesheetApprovals");
        if (config is null)
            throw new InvalidOperationException("Timesheet approval fetching is not configured. Add a 'Fetch Timesheet Approvals' action in Integrations.");
        if (!config.Enabled)
            throw new InvalidOperationException("Timesheet approval fetching is disabled. Enable it in Integrations.");

        var headers = JsonSerializer.Deserialize<Dictionary<string, string>>(config.HeadersJson) ?? new();
        var mapping = JsonSerializer.Deserialize<MappingConfigDto>(config.MappingJson) ?? new MappingConfigDto();
        var configVars = await ConfigVariableResolver.LoadAsync(_db);

        var client = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
        client.DefaultRequestHeaders.Accept.ParseAdd("application/json, text/javascript, */*; q=0.01");

        foreach (var (key, value) in headers)
        {
            var resolved = ResolveTemplate(ConfigVariableResolver.Apply(value, configVars), request);
            client.DefaultRequestHeaders.Add(key, resolved);
        }

        var secretHeaders = JsonSerializer.Deserialize<Dictionary<string, string>>(
            string.IsNullOrWhiteSpace(config.SecretHeadersJson) ? "{}" : config.SecretHeadersJson) ?? new();
        foreach (var (k, v) in secretHeaders)
            client.DefaultRequestHeaders.TryAddWithoutValidation(k, v);

        var url = ResolveTemplate(ConfigVariableResolver.Apply(config.Url, configVars), request);
        HttpResponseMessage response;

        if (config.Method.Equals("POST", StringComparison.OrdinalIgnoreCase))
        {
            var body = ResolveTemplate(ConfigVariableResolver.Apply(config.BodyTemplate, configVars), request);
            var content = new StringContent(body);
            content.Headers.ContentType = new MediaTypeHeaderValue(
                config.IsFormUrlEncoded ? "application/x-www-form-urlencoded" : "application/json");
            response = await client.PostAsync(url, content);
        }
        else
        {
            response = await client.GetAsync(url);
        }

        var json = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"External API returned {(int)response.StatusCode}.");

        var root = JsonDocument.Parse(json).RootElement;

        JsonElement arrayElement;
        if (!string.IsNullOrWhiteSpace(mapping.ArrayPath))
        {
            arrayElement = NavigatePath(root, ParsePath(mapping.ArrayPath));
            if (arrayElement.ValueKind != JsonValueKind.Array)
                throw new InvalidOperationException($"Array path '{mapping.ArrayPath}' does not resolve to an array.");
        }
        else if (root.ValueKind == JsonValueKind.Array)
        {
            arrayElement = root;
        }
        else
        {
            throw new InvalidOperationException("Response is not a JSON array and no array path is configured.");
        }

        var records = JsonSerializer.Deserialize<List<JsonElement>>(arrayElement.GetRawText()) ?? [];
        return records.Select(r => ToEntry(r, mapping)).ToList();
    }

    private static ImportedTimesheetEntry ToEntry(JsonElement r, MappingConfigDto mapping)
    {
        var memberName = GetProperty(r, mapping.MemberNamePath);
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
            DateOnly.TryParse(dateStr, out var date) ? date : DateOnly.MinValue,
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

    private static string ResolveTemplate(string template, FetchTimesheetApprovalsRequest request)
    {
        return template
            .Replace("{cookie}", request.Cookie ?? "")
            .Replace("{start}", request.Start)
            .Replace("{end}", request.End);
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
                if (current.TryGetProperty(segment, out var next)) current = next;
                else return default;
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
