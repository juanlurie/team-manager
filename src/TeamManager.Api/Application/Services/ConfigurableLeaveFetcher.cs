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
        if (!json.TrimStart().StartsWith('['))
            throw new InvalidOperationException("External API did not return a JSON array.");

        var records = JsonSerializer.Deserialize<List<JsonElement>>(json) ?? [];
        return records.Select(r => ToImportRecord(r, mapping)).ToList();
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
        if (element.TryGetProperty(path, out var prop))
        {
            return prop.ValueKind == JsonValueKind.String ? prop.GetString() ?? "" : prop.GetRawText();
        }
        return "";
    }
}

public class MappingConfig
{
    public string NamePath { get; set; } = "title";
    public string StartPath { get; set; } = "start";
    public string EndPath { get; set; } = "end";
    public string TypePath { get; set; } = "type";
    public string DaysPath { get; set; } = "totalDays";
    public string StatusPath { get; set; } = "status";
    public string NameTransform { get; set; } = "ExtractBeforeDash";
}
