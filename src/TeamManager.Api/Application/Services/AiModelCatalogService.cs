using System.Text.Json;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Application.Services;

// Fetches the list of available model ids for an AI connection by calling the provider's own
// "list models" API with the connection's stored credentials. Provider is detected from the
// connection URL (same convention as the frontend's Library matchesConfig). Best-effort: any
// failure surfaces as an exception the controller turns into a 502 so the UI can fall back to
// free-text model entry.
public class AiModelCatalogService
{
    private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };

    public async Task<List<string>> FetchModelsAsync(ApiRequestConfig config, CancellationToken ct = default)
    {
        var url = config.Url ?? "";
        var headers = Deserialize(config.HeadersJson);
        var secret = Deserialize(config.SecretHeadersJson);

        // (endpoint, arrayProperty, idProperty, stripPrefix)
        (string endpoint, string arrayProp, string idProp, string? strip)? spec = null;

        if (url.Contains("anthropic.com"))
        {
            if (!headers.ContainsKey("anthropic-version") && !secret.ContainsKey("anthropic-version"))
                headers["anthropic-version"] = "2023-06-01";
            spec = ("https://api.anthropic.com/v1/models?limit=100", "data", "id", null);
        }
        else if (url.Contains("openai.com"))
            spec = ("https://api.openai.com/v1/models", "data", "id", null);
        else if (url.Contains("groq.com"))
            spec = ("https://api.groq.com/openai/v1/models", "data", "id", null);
        else if (url.Contains("generativelanguage.googleapis.com"))
        {
            // Gemini takes the key as a query param, not a header.
            var key = secret.GetValueOrDefault("key") ?? ExtractQueryKey(url);
            var sep = string.IsNullOrEmpty(key) ? "" : $"?key={key}";
            spec = ($"https://generativelanguage.googleapis.com/v1beta/models{sep}", "models", "name", "models/");
        }
        else
        {
            // Assume an Ollama-compatible host (custom/self-hosted): {scheme}://{host}/api/tags
            if (Uri.TryCreate(url, UriKind.Absolute, out var u))
                spec = ($"{u.Scheme}://{u.Authority}/api/tags", "models", "name", null);
        }

        if (spec is null)
            throw new InvalidOperationException("Could not determine the model-list API for this connection's provider.");

        var (endpoint, arrayProp, idProp, strip) = spec.Value;

        using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(12) };
        using var req = new HttpRequestMessage(HttpMethod.Get, endpoint);
        foreach (var (k, v) in headers) req.Headers.TryAddWithoutValidation(k, v);
        foreach (var (k, v) in secret) req.Headers.TryAddWithoutValidation(k, v);

        using var resp = await client.SendAsync(req, ct);
        var body = await resp.Content.ReadAsStringAsync(ct);
        if (!resp.IsSuccessStatusCode)
            throw new InvalidOperationException($"Provider returned {(int)resp.StatusCode} when listing models.");

        using var doc = JsonDocument.Parse(body);
        if (!doc.RootElement.TryGetProperty(arrayProp, out var arr) || arr.ValueKind != JsonValueKind.Array)
            throw new InvalidOperationException("Unexpected model-list response shape.");

        var models = new List<string>();
        foreach (var item in arr.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object || !item.TryGetProperty(idProp, out var idEl)) continue;
            var id = idEl.GetString();
            if (string.IsNullOrWhiteSpace(id)) continue;
            if (strip is not null && id.StartsWith(strip)) id = id[strip.Length..];
            models.Add(id);
        }

        return models.Distinct().OrderBy(m => m, StringComparer.OrdinalIgnoreCase).ToList();
    }

    private static Dictionary<string, string> Deserialize(string? json) =>
        string.IsNullOrWhiteSpace(json)
            ? new()
            : JsonSerializer.Deserialize<Dictionary<string, string>>(json, Json) ?? new();

    private static string? ExtractQueryKey(string url)
    {
        var idx = url.IndexOf("key=", StringComparison.OrdinalIgnoreCase);
        if (idx < 0) return null;
        var rest = url[(idx + 4)..];
        var amp = rest.IndexOf('&');
        return amp < 0 ? rest : rest[..amp];
    }
}
