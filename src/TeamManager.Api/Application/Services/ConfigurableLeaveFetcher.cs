using System.Net.Http.Headers;
using System.Text.Json;
using TeamManager.Api.Application.DTOs.LeaveRecord;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Application.Services;

public class ConfigurableLeaveFetcher : ILeaveFetcher
{
    private readonly LeaveFetchConfig _config;
    private readonly IHttpClientFactory _httpClientFactory;

    public ConfigurableLeaveFetcher(LeaveFetchConfig config, IHttpClientFactory httpClientFactory)
    {
        _config = config;
        _httpClientFactory = httpClientFactory;
    }

    public bool IsConfigured => _config.Enabled && !string.IsNullOrEmpty(_config.Url);

    public async Task<IReadOnlyList<ImportLeaveRecord>> FetchAsync(FetchLeaveRequest request)
    {
        var client = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
        client.DefaultRequestHeaders.Accept.ParseAdd("application/json, text/javascript, */*; q=0.01");

        foreach (var (key, value) in _config.Headers)
        {
            var resolved = ResolveTemplate(value, request);
            client.DefaultRequestHeaders.Add(key, resolved);
        }

        HttpResponseMessage response;
        if (_config.Method.Equals("POST", StringComparison.OrdinalIgnoreCase))
        {
            var body = ResolveTemplate(_config.BodyTemplate, request);
            if (_config.IsFormUrlEncoded)
            {
                var content = new StringContent(body);
                content.Headers.ContentType = new MediaTypeHeaderValue("application/x-www-form-urlencoded");
                response = await client.PostAsync(_config.Url, content);
            }
            else
            {
                var content = new StringContent(body);
                content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
                response = await client.PostAsync(_config.Url, content);
            }
        }
        else
        {
            var url = ResolveTemplate(_config.Url, request);
            response = await client.GetAsync(url);
        }

        var json = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"External API returned {(int)response.StatusCode}.");
        if (!json.TrimStart().StartsWith('['))
            throw new InvalidOperationException("External API did not return a JSON array.");

        var records = JsonSerializer.Deserialize<List<JsonElement>>(json) ?? [];
        return records.Select(ToImportRecord).ToList();
    }

    private string ResolveTemplate(string template, FetchLeaveRequest request)
    {
        return template
            .Replace("{cookie}", request.Cookie ?? "")
            .Replace("{start}", request.Start)
            .Replace("{end}", request.End)
            .Replace("{teamIds}", string.Join(",", request.TeamIds));
    }

    private ImportLeaveRecord ToImportRecord(JsonElement r)
    {
        var mapping = _config.Mapping;
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
