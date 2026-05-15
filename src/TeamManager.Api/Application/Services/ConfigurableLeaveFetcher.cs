using System.Net.Http.Headers;
using System.Text.Json;
using TeamManager.Api.Application.DTOs.LeaveRecord;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace TeamManager.Api.Application.Services;

public class ConfigurableLeaveFetcher : ILeaveFetcher
{
    private readonly AppDbContext _db;

    public ConfigurableLeaveFetcher(AppDbContext db) => _db = db;

    public bool IsConfigured => true; // Config is always available from DB, check Enabled at runtime

    public async Task<IReadOnlyList<ImportLeaveRecord>> FetchAsync(FetchLeaveRequest request)
    {
        var config = await _db.ApiRequestConfigs.FirstOrDefaultAsync(c => c.Name == "Leave Fetch");
        if (config == null)
        {
            var legacyConfig = await _db.LeaveFetchConfigs.FirstOrDefaultAsync();
            if (legacyConfig == null || !legacyConfig.Enabled)
                throw new InvalidOperationException("Leave fetching is not configured or disabled. Configure it in Settings.");
            config = new Domain.Entities.ApiRequestConfig
            {
                Enabled = legacyConfig.Enabled,
                Url = legacyConfig.Url,
                Method = legacyConfig.Method,
                IsFormUrlEncoded = legacyConfig.IsFormUrlEncoded,
                HeadersJson = legacyConfig.HeadersJson,
                BodyTemplate = legacyConfig.BodyTemplate,
                MappingJson = legacyConfig.MappingJson
            };
        }
        else if (!config.Enabled)
        {
            throw new InvalidOperationException("Leave fetching is disabled. Configure it in Settings.");
        }

        var headers = JsonSerializer.Deserialize<Dictionary<string, string>>(config.HeadersJson) ?? new();
        var mapping = JsonSerializer.Deserialize<MappingConfig>(config.MappingJson) ?? new MappingConfig();

        var client = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
        client.DefaultRequestHeaders.Accept.ParseAdd("application/json, text/javascript, */*; q=0.01");

        foreach (var (key, value) in headers)
        {
            var resolved = ResolveTemplate(value, request);
            client.DefaultRequestHeaders.Add(key, resolved);
        }

        HttpResponseMessage response;
        var url = ResolveTemplate(config.Url, request);

        if (config.Method.Equals("POST", StringComparison.OrdinalIgnoreCase))
        {
            var body = ResolveTemplate(config.BodyTemplate, request);
            if (config.IsFormUrlEncoded)
            {
                var content = new StringContent(body);
                content.Headers.ContentType = new MediaTypeHeaderValue("application/x-www-form-urlencoded");
                response = await client.PostAsync(url, content);
            }
            else
            {
                var content = new StringContent(body);
                content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
                response = await client.PostAsync(url, content);
            }
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
            var segments = ParsePath(mapping.ArrayPath);
            arrayElement = NavigatePath(root, segments);
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
        return records.Select(r => ToImportRecord(r, mapping)).ToList();
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
                }
                else
                {
                    return default;
                }
            }
            else if (current.ValueKind == JsonValueKind.Array)
            {
                if (int.TryParse(segment, out var index) && index < current.GetArrayLength())
                {
                    current = current[index];
                }
                else
                {
                    return default;
                }
            }
            else
            {
                return default;
            }
        }
        return current;
    }

    private static string ResolveTemplate(string template, FetchLeaveRequest request)
    {
        return template
            .Replace("{cookie}", request.Cookie ?? "")
            .Replace("{start}", request.Start)
            .Replace("{end}", request.End)
            .Replace("{teamIds}", string.Join(",", request.TeamIds));
    }

    private static ImportLeaveRecord ToImportRecord(JsonElement r, MappingConfig mapping)
    {
        var name = GetProperty(r, mapping.NamePath);
        var start = GetProperty(r, mapping.StartPath);
        var end = GetProperty(r, mapping.EndPath);
        var type = GetProperty(r, mapping.TypePath) ?? "Other";
        var days = GetProperty(r, mapping.DaysPath) ?? "1";
        var status = GetProperty(r, mapping.StatusPath) ?? "";

        if (mapping.NameTransform == "ExtractBeforeDash")
        {
            name = name.Split(" - ")[0].Trim();
        }

        return new ImportLeaveRecord(name, start, end, type, days, status);
    }

    private static string GetProperty(JsonElement element, string path)
    {
        if (string.IsNullOrEmpty(path)) return "";

        var current = element;
        var segments = ParsePath(path);

        foreach (var segment in segments)
        {
            if (current.ValueKind == JsonValueKind.Object)
            {
                if (current.TryGetProperty(segment, out var next))
                {
                    current = next;
                }
                else
                {
                    return "";
                }
            }
            else if (current.ValueKind == JsonValueKind.Array)
            {
                if (int.TryParse(segment, out var index) && index < current.GetArrayLength())
                {
                    current = current[index];
                }
                else
                {
                    return "";
                }
            }
            else
            {
                return "";
            }
        }

        return current.ValueKind == JsonValueKind.String ? current.GetString() ?? "" : current.GetRawText();
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
                if (!string.IsNullOrEmpty(current))
                {
                    segments.Add(current);
                    current = "";
                }
                i++;
            }
            else if (path[i] == '[')
            {
                if (!string.IsNullOrEmpty(current))
                {
                    segments.Add(current);
                    current = "";
                }
                i++;
                var bracketEnd = path.IndexOf(']', i);
                if (bracketEnd > i)
                {
                    segments.Add(path.Substring(i, bracketEnd - i));
                    i = bracketEnd + 1;
                }
                else
                {
                    break;
                }
            }
            else
            {
                current += path[i];
                i++;
            }
        }

        if (!string.IsNullOrEmpty(current))
        {
            segments.Add(current);
        }

        return segments;
    }
}

public class MappingConfig
{
    public string ArrayPath { get; set; } = "";
    public string NamePath { get; set; } = "title";
    public string StartPath { get; set; } = "start";
    public string EndPath { get; set; } = "end";
    public string TypePath { get; set; } = "type";
    public string DaysPath { get; set; } = "totalDays";
    public string StatusPath { get; set; } = "status";
    public string NameTransform { get; set; } = "ExtractBeforeDash";
}
