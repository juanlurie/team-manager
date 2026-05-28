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
            HeadersJson = JsonSerializer.Serialize(dto.Headers ?? new()),
            BodyTemplate = dto.BodyTemplate,
            MappingJson = JsonSerializer.Serialize(dto.Mapping ?? new MappingConfigDto())
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
        config.HeadersJson = JsonSerializer.Serialize(dto.Headers ?? new());
        config.BodyTemplate = dto.BodyTemplate;
        config.MappingJson = JsonSerializer.Serialize(dto.Mapping ?? new MappingConfigDto());
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
                existing.HeadersJson = JsonSerializer.Serialize(dto.Headers ?? new());
                existing.BodyTemplate = dto.BodyTemplate;
                existing.MappingJson = JsonSerializer.Serialize(dto.Mapping ?? new MappingConfigDto());
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
                    HeadersJson = JsonSerializer.Serialize(dto.Headers ?? new()),
                    BodyTemplate = dto.BodyTemplate,
                    MappingJson = JsonSerializer.Serialize(dto.Mapping ?? new MappingConfigDto())
                };
                _db.ApiRequestConfigs.Add(config);
                created.Add(ToDto(config));
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new { Created = created.Count, Updated = updated.Count });
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

    private static ApiRequestConfigDto ToDto(ApiRequestConfig config) => new(
        Id: config.Id,
        Action: config.Action,
        Name: config.Name,
        Description: config.Description,
        Enabled: config.Enabled,
        Url: config.Url,
        Method: config.Method,
        IsFormUrlEncoded: config.IsFormUrlEncoded,
        Headers: JsonSerializer.Deserialize<Dictionary<string, string>>(config.HeadersJson) ?? new(),
        BodyTemplate: config.BodyTemplate,
        Mapping: JsonSerializer.Deserialize<MappingConfigDto>(config.MappingJson) ?? new MappingConfigDto()
    );
}

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
