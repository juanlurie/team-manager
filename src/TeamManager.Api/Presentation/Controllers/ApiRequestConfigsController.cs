using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using TeamManager.Api.Application.DTOs;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("settings")]
[Route("api/v1/request-configs")]
[Authorize]
public class ApiRequestConfigsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ApiRequestConfigsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var configs = await _db.ApiRequestConfigs
            .OrderBy(c => c.Name)
            .ToListAsync();

        return Ok(configs.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var config = await _db.ApiRequestConfigs.FindAsync(id);
        if (config == null) return NotFound();
        return Ok(ToDto(config));
    }

    [HttpPost]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Create([FromBody] ApiRequestConfigDto dto)
    {
        var config = new ApiRequestConfig
        {
            Action = dto.Action,
            Name = dto.Name,
            Description = dto.Description,
            Enabled = dto.Enabled,
            Url = dto.Url,
            Method = dto.Method,
            IsFormUrlEncoded = dto.IsFormUrlEncoded,
            BodyFormat = dto.BodyFormat ?? "urlencoded",
            HeadersJson = JsonSerializer.Serialize(dto.Headers ?? new()),
            BodyTemplate = dto.BodyTemplate,
            MappingJson = JsonSerializer.Serialize(dto.Mapping ?? new MappingConfigDto()),
            ParametersJson = JsonSerializer.Serialize(dto.Parameters ?? new()),
            StoredCookie = dto.StoredCookie,
            SecretHeadersJson = JsonSerializer.Serialize(dto.SecretHeaders ?? new()),
            RetryCount = dto.RetryCount,
            SuccessCriteriaJson = dto.SuccessCriteria is null ? null : JsonSerializer.Serialize(dto.SuccessCriteria),
            AutoSync = dto.AutoSync,
            IsAiConnection = dto.IsAiConnection,
        };

        _db.ApiRequestConfigs.Add(config);
        await _db.SaveChangesAsync();
        return Ok(ToDto(config));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Update(Guid id, [FromBody] ApiRequestConfigDto dto)
    {
        var config = await _db.ApiRequestConfigs.FindAsync(id);
        if (config == null) return NotFound();

        config.Action = dto.Action;
        config.Name = dto.Name;
        config.Description = dto.Description;
        config.Enabled = dto.Enabled;
        config.Url = dto.Url;
        config.Method = dto.Method;
        config.IsFormUrlEncoded = dto.IsFormUrlEncoded;
        config.BodyFormat = dto.BodyFormat ?? "urlencoded";
        config.HeadersJson = JsonSerializer.Serialize(dto.Headers ?? new());
        config.BodyTemplate = dto.BodyTemplate;
        config.MappingJson = JsonSerializer.Serialize(dto.Mapping ?? new MappingConfigDto());
        config.ParametersJson = JsonSerializer.Serialize(dto.Parameters ?? new());
        if (dto.StoredCookie is not null) config.StoredCookie = dto.StoredCookie;
        config.SecretHeadersJson = MergeSecretHeaders(config.SecretHeadersJson, dto.SecretHeaders);
        config.RetryCount = dto.RetryCount;
        config.SuccessCriteriaJson = dto.SuccessCriteria is null ? null : JsonSerializer.Serialize(dto.SuccessCriteria);
        config.AutoSync = dto.AutoSync;
        config.IsAiConnection = dto.IsAiConnection;
        config.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(ToDto(config));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var config = await _db.ApiRequestConfigs.FindAsync(id);
        if (config == null) return NotFound();

        _db.ApiRequestConfigs.Remove(config);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("export")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Export()
    {
        var configs = await _db.ApiRequestConfigs
            .OrderBy(c => c.Name)
            .ToListAsync();

        var exportData = configs.Select(c => new
        {
            c.Action,
            c.Name,
            c.Description,
            c.Enabled,
            c.Url,
            c.Method,
            c.IsFormUrlEncoded,
            Headers = JsonSerializer.Deserialize<Dictionary<string, string>>(c.HeadersJson) ?? new Dictionary<string, string>(),
            c.BodyTemplate,
            Mapping = JsonSerializer.Deserialize<MappingConfigDto>(c.MappingJson) ?? new MappingConfigDto()
        });

        var json = JsonSerializer.Serialize(exportData, new JsonSerializerOptions { WriteIndented = true });
        return File(System.Text.Encoding.UTF8.GetBytes(json), "application/json", "request-configs.json");
    }

    [HttpPost("import")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Import([FromBody] List<ApiRequestConfigDto> dtos)
    {
        if (dtos == null || dtos.Count == 0)
            return BadRequest("No configs provided");

        var created = new List<ApiRequestConfigDto>();
        var updated = new List<ApiRequestConfigDto>();

        foreach (var dto in dtos)
        {
            var existing = await _db.ApiRequestConfigs.FirstOrDefaultAsync(c => c.Action == dto.Action && c.Name == dto.Name);
            if (existing != null)
            {
                existing.Action = dto.Action;
                existing.Name = dto.Name;
                existing.Description = dto.Description;
                existing.Enabled = dto.Enabled;
                existing.Url = dto.Url;
                existing.Method = dto.Method;
                existing.IsFormUrlEncoded = dto.IsFormUrlEncoded;
                existing.BodyFormat = dto.BodyFormat ?? "urlencoded";
                existing.HeadersJson = JsonSerializer.Serialize(dto.Headers ?? new());
                existing.BodyTemplate = dto.BodyTemplate;
                existing.MappingJson = JsonSerializer.Serialize(dto.Mapping ?? new MappingConfigDto());
                existing.ParametersJson = JsonSerializer.Serialize(dto.Parameters ?? new());
                existing.UpdatedAt = DateTimeOffset.UtcNow;
                updated.Add(ToDto(existing));
            }
            else
            {
                var config = new ApiRequestConfig
                {
                    Action = dto.Action,
                    Name = dto.Name,
                    Description = dto.Description,
                    Enabled = dto.Enabled,
                    Url = dto.Url,
                    Method = dto.Method,
                    IsFormUrlEncoded = dto.IsFormUrlEncoded,
            BodyFormat = dto.BodyFormat ?? "urlencoded",
                    HeadersJson = JsonSerializer.Serialize(dto.Headers ?? new()),
                    BodyTemplate = dto.BodyTemplate,
                    MappingJson = JsonSerializer.Serialize(dto.Mapping ?? new MappingConfigDto()),
                    ParametersJson = JsonSerializer.Serialize(dto.Parameters ?? new()),
                    RetryCount = dto.RetryCount,
                    SuccessCriteriaJson = dto.SuccessCriteria is null ? null : JsonSerializer.Serialize(dto.SuccessCriteria),
                    AutoSync = dto.AutoSync,
                    IsAiConnection = dto.IsAiConnection,
                };
                _db.ApiRequestConfigs.Add(config);
                created.Add(ToDto(config));
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new { Created = created.Count, Updated = updated.Count });
    }

    [HttpPost("test-request")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> TestRequest([FromBody] TestRequestPayload payload)
    {
        var dto = payload.Config;
        if (string.IsNullOrWhiteSpace(dto.Url))
            return BadRequest("URL is required");

        // Load real secret headers from DB if this is a saved config
        Dictionary<string, string> secretHeaders = new();
        if (dto.Id.HasValue)
        {
            var stored = await _db.ApiRequestConfigs.FindAsync(dto.Id.Value);
            if (stored is not null)
                secretHeaders = JsonSerializer.Deserialize<Dictionary<string, string>>(
                    string.IsNullOrWhiteSpace(stored.SecretHeadersJson) ? "{}" : stored.SecretHeadersJson) ?? new();
        }
        else if (dto.SecretHeaders is not null)
        {
            // Unsaved config: frontend sends actual values (visible in this request, but not yet stored)
            secretHeaders = dto.SecretHeaders.Where(kv => kv.Value != "**SECRET**")
                                             .ToDictionary(kv => kv.Key, kv => kv.Value);
        }

        var vars = payload.Variables ?? new();
        var configParams = dto.Parameters ?? new();
        var configVars = await Application.Services.ConfigVariableResolver.LoadAsync(_db);
        string Resolve(string template)
        {
            // Config variables first (lowest priority), then per-config params, then runtime vars
            var result = Application.Services.ConfigVariableResolver.Apply(template, configVars);
            foreach (var (key, value) in configParams)
                result = result.Replace($"{{{key}}}", value);
            foreach (var (key, value) in vars)
                result = result.Replace($"{{{key}}}", value);
            return result;
        }

        try
        {
            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
            client.DefaultRequestHeaders.Accept.ParseAdd("application/json, text/javascript, */*; q=0.01");

            foreach (var (key, value) in dto.Headers ?? new())
                client.DefaultRequestHeaders.TryAddWithoutValidation(key, Resolve(value));

            // Inject secret headers (not resolved through variables — they are literal values)
            foreach (var (key, value) in secretHeaders)
                client.DefaultRequestHeaders.TryAddWithoutValidation(key, value);

            var url = Resolve(dto.Url);
            HttpResponseMessage response;

            if (dto.Method.Equals("POST", StringComparison.OrdinalIgnoreCase))
            {
                var body = Resolve(dto.BodyTemplate ?? "");
                var fmt = dto.BodyFormat ?? (dto.IsFormUrlEncoded ? "urlencoded" : "json");
                HttpContent content;
                if (fmt == "raw")
                {
                    content = new System.Net.Http.StringContent(body);
                    content.Headers.ContentType = null;
                }
                else
                {
                    var mediaType = fmt == "urlencoded" ? "application/x-www-form-urlencoded" : "application/json";
                    content = new System.Net.Http.StringContent(body, System.Text.Encoding.UTF8, mediaType);
                }
                response = await client.PostAsync(url, content);
            }
            else
            {
                response = await client.GetAsync(url);
            }

            var responseBody = await response.Content.ReadAsStringAsync();
            return Ok(new { StatusCode = (int)response.StatusCode, Body = responseBody, Success = response.IsSuccessStatusCode });
        }
        catch (TaskCanceledException)
        {
            return Ok(new { StatusCode = 0, Body = "Request timed out after 30 seconds", Success = false });
        }
        catch (Exception ex)
        {
            return Ok(new { StatusCode = 0, Body = ex.Message, Success = false });
        }
    }

    [HttpPost("test-mapping")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> TestMapping([FromBody] TestMappingRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SampleJson))
            return BadRequest("Sample JSON required");

        try
        {
            var doc = JsonDocument.Parse(request.SampleJson);
            var root = doc.RootElement;

            JsonElement target;
            if (!string.IsNullOrWhiteSpace(request.ArrayPath))
            {
                var segments = ParsePath(request.ArrayPath);
                target = NavigatePath(root, segments);
                if (target.ValueKind != JsonValueKind.Array)
                    return BadRequest("Array path does not resolve to an array");
            }
            else if (root.ValueKind == JsonValueKind.Array)
            {
                target = root;
            }
            else
            {
                return BadRequest("JSON root is not an array and no array path specified");
            }

            var firstItem = target.GetArrayLength() > 0 ? target[0] : default;
            var paths = DiscoverPaths(target, 3);

            var testResults = new Dictionary<string, string?>();
            var fields = request.Fields ?? new Dictionary<string, string>();
            if (firstItem.ValueKind != JsonValueKind.Undefined)
            {
                foreach (var (label, path) in fields)
                {
                    if (!string.IsNullOrWhiteSpace(path))
                    {
                        var segments = ParsePath(path);
                        var value = NavigatePath(firstItem, segments);
                        testResults[label] = value.ValueKind == JsonValueKind.String ? value.GetString() : value.GetRawText();
                    }
                    else
                    {
                        testResults[label] = null;
                    }
                }
            }

            return Ok(new TestMappingResponse
            {
                AvailablePaths = paths,
                TestResults = testResults,
                ArrayLength = target.GetArrayLength()
            });
        }
        catch (JsonException ex)
        {
            return BadRequest($"Invalid JSON: {ex.Message}");
        }
    }

    [HttpPost("test-project-mapping")]
    [Authorize(Roles = "TeamLead")]
    public IActionResult TestProjectMapping([FromBody] TestProjectMappingRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SampleResponse))
            return BadRequest("Sample response required");
        if (string.IsNullOrWhiteSpace(request.ProjectNamePath))
            return BadRequest("Project Name Path is required to test");

        try
        {
            JsonElement projectsEl;

            if (request.ResponseFormat == "html")
            {
                var marker = string.IsNullOrWhiteSpace(request.HtmlJsonMarker) ? "[" : request.HtmlJsonMarker;
                var markerIdx = request.SampleResponse.IndexOf(marker, StringComparison.Ordinal);
                if (markerIdx < 0) return BadRequest($"Marker \"{marker}\" not found in the sample response");

                var arrayStart = request.SampleResponse.IndexOf('[', markerIdx);
                if (arrayStart < 0) return BadRequest("No JSON array found after the marker");

                var depth = 0;
                var arrayEnd = -1;
                for (var i = arrayStart; i < request.SampleResponse.Length; i++)
                {
                    if (request.SampleResponse[i] == '[') depth++;
                    else if (request.SampleResponse[i] == ']') { depth--; if (depth == 0) { arrayEnd = i; break; } }
                }
                if (arrayEnd < 0) return BadRequest("Could not find the end of the JSON array");

                var arrayJson = request.SampleResponse[arrayStart..(arrayEnd + 1)];
                using var htmlDoc = JsonDocument.Parse(arrayJson);
                projectsEl = htmlDoc.RootElement.Clone();
            }
            else
            {
                using var jsonDoc = JsonDocument.Parse(request.SampleResponse);
                var root = jsonDoc.RootElement;
                projectsEl = string.IsNullOrWhiteSpace(request.ProjectsPath)
                    ? root.Clone()
                    : NavigatePath(root, ParsePath(request.ProjectsPath)).Clone();
            }

            if (projectsEl.ValueKind != JsonValueKind.Array)
                return BadRequest("Projects Path does not resolve to an array");

            var results = new List<ProjectMappingResult>();
            foreach (var proj in projectsEl.EnumerateArray())
            {
                var projName = GetMappedString(proj, request.ProjectNamePath);
                if (string.IsNullOrWhiteSpace(projName)) continue;

                var projId = GetMappedString(proj, request.ProjectIdPath);
                var categories = new List<CategoryMappingResult>();

                if (!string.IsNullOrWhiteSpace(request.ProjectCategoriesPath))
                {
                    var catsEl = NavigatePath(proj, ParsePath(request.ProjectCategoriesPath));
                    if (catsEl.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var cat in catsEl.EnumerateArray())
                        {
                            var catName = GetMappedString(cat, request.CategoryNamePath);
                            if (string.IsNullOrWhiteSpace(catName)) continue;
                            categories.Add(new CategoryMappingResult(catName, GetMappedString(cat, request.CategoryIdPath), GetCustomFieldValues(cat, request.CustomFields)));
                        }
                    }
                }

                results.Add(new ProjectMappingResult(projName, projId, categories, GetCustomFieldValues(proj, request.CustomFields)));
            }

            return Ok(new TestProjectMappingResponse(results, projectsEl.GetArrayLength()));
        }
        catch (JsonException ex)
        {
            return BadRequest($"Invalid JSON: {ex.Message}");
        }
    }

    private static string? GetMappedString(JsonElement el, string? path)
    {
        if (string.IsNullOrWhiteSpace(path)) return null;
        var target = NavigatePath(el, ParsePath(path));
        if (target.ValueKind == JsonValueKind.Undefined) return null;
        return target.ValueKind == JsonValueKind.String ? target.GetString() : target.ToString();
    }

    private static Dictionary<string, string> GetCustomFieldValues(JsonElement el, Dictionary<string, string>? customFields)
    {
        var values = new Dictionary<string, string>();
        if (customFields is null) return values;
        foreach (var (label, path) in customFields)
        {
            var val = GetMappedString(el, path);
            if (!string.IsNullOrWhiteSpace(val)) values[label] = val;
        }
        return values;
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

    private static List<string> DiscoverPaths(JsonElement element, int maxDepth, string prefix = "")
    {
        var paths = new List<string>();

        if (maxDepth <= 0) return paths;

        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var prop in element.EnumerateObject())
            {
                var path = string.IsNullOrEmpty(prefix) ? prop.Name : $"{prefix}.{prop.Name}";
                paths.Add(path);
                if (prop.Value.ValueKind == JsonValueKind.Object || prop.Value.ValueKind == JsonValueKind.Array)
                {
                    paths.AddRange(DiscoverPaths(prop.Value, maxDepth - 1, path));
                }
            }
        }
        else if (element.ValueKind == JsonValueKind.Array && element.GetArrayLength() > 0)
        {
            var first = element[0];
            if (first.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in first.EnumerateObject())
                {
                    var path = string.IsNullOrEmpty(prefix) ? $"[0].{prop.Name}" : $"{prefix}[0].{prop.Name}";
                    paths.Add(path);
                    if (prop.Value.ValueKind == JsonValueKind.Object || prop.Value.ValueKind == JsonValueKind.Array)
                    {
                        paths.AddRange(DiscoverPaths(prop.Value, maxDepth - 1, path));
                    }
                }
            }
        }

        return paths;
    }

    private static string MergeSecretHeaders(string existingJson, Dictionary<string, string>? incoming)
    {
        if (incoming is null || incoming.Count == 0)
            return existingJson;

        var existing = JsonSerializer.Deserialize<Dictionary<string, string>>(
            string.IsNullOrWhiteSpace(existingJson) ? "{}" : existingJson) ?? new();

        // Remove keys no longer marked secret
        var keysToRemove = existing.Keys.Except(incoming.Keys).ToList();
        foreach (var k in keysToRemove) existing.Remove(k);

        // Update keys: skip **SECRET** (keep stored value), update new real values
        foreach (var (key, value) in incoming)
        {
            if (value != "**SECRET**")
                existing[key] = value;
            // if "**SECRET**" and key not in existing yet, just skip (nothing to preserve)
        }

        return JsonSerializer.Serialize(existing);
    }

    private static ApiRequestConfigDto ToDto(ApiRequestConfig config)
    {
        var secretKeys = (JsonSerializer.Deserialize<Dictionary<string, string>>(
            string.IsNullOrWhiteSpace(config.SecretHeadersJson) ? "{}" : config.SecretHeadersJson) ?? new()).Keys;
        var maskedSecretHeaders = secretKeys.ToDictionary(k => k, _ => "**SECRET**");

        return new(
            Id: config.Id,
            Action: config.Action,
            Name: config.Name,
            Description: config.Description,
            Enabled: config.Enabled,
            Url: config.Url,
            Method: config.Method,
            IsFormUrlEncoded: config.IsFormUrlEncoded,
            BodyFormat: config.BodyFormat,
            Headers: JsonSerializer.Deserialize<Dictionary<string, string>>(config.HeadersJson) ?? new(),
            BodyTemplate: config.BodyTemplate,
            Mapping: JsonSerializer.Deserialize<MappingConfigDto>(config.MappingJson) ?? new MappingConfigDto(),
            Parameters: JsonSerializer.Deserialize<Dictionary<string, string>>(string.IsNullOrWhiteSpace(config.ParametersJson) ? "{}" : config.ParametersJson) ?? new(),
            StoredCookie: null,
            SecretHeaders: maskedSecretHeaders,
            RetryCount: config.RetryCount,
            SuccessCriteria: string.IsNullOrWhiteSpace(config.SuccessCriteriaJson)
                ? null
                : JsonSerializer.Deserialize<SuccessCriteriaDto>(config.SuccessCriteriaJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }),
            AutoSync: config.AutoSync,
            IsAiConnection: config.IsAiConnection
        );
    }
}

public record TestRequestPayload(
    ApiRequestConfigDto Config,
    Dictionary<string, string>? Variables = null
);

public record TestMappingRequest(
    string SampleJson = "",
    string? ArrayPath = null,
    Dictionary<string, string>? Fields = null
);

public record TestMappingResponse
{
    public List<string> AvailablePaths { get; set; } = new();
    public Dictionary<string, string?> TestResults { get; set; } = new();
    public int ArrayLength { get; set; }
}

public record TestProjectMappingRequest(
    string SampleResponse = "",
    string ResponseFormat = "json",
    string? HtmlJsonMarker = null,
    string? ProjectsPath = null,
    string ProjectNamePath = "",
    string? ProjectIdPath = null,
    string? ProjectCategoriesPath = null,
    string? CategoryNamePath = null,
    string? CategoryIdPath = null,
    Dictionary<string, string>? CustomFields = null
);

public record CategoryMappingResult(string Name, string? Id, Dictionary<string, string> CustomFields);
public record ProjectMappingResult(string Name, string? Id, List<CategoryMappingResult> Categories, Dictionary<string, string> CustomFields);
public record TestProjectMappingResponse(List<ProjectMappingResult> Projects, int ArrayLength);
