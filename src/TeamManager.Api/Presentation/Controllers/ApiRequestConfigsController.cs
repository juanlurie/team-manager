using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using TeamManager.Api.Application.DTOs;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
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
            var existing = await _db.ApiRequestConfigs.FirstOrDefaultAsync(c => c.Name == dto.Name);
            if (existing != null)
            {
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

    private static ApiRequestConfigDto ToDto(ApiRequestConfig config) => new(
        Id: config.Id,
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
