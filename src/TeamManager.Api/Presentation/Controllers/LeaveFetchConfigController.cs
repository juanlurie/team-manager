using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/leave-fetch-config")]
[Authorize]
public class LeaveFetchConfigController : ControllerBase
{
    private readonly AppDbContext _db;

    public LeaveFetchConfigController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var config = await _db.LeaveFetchConfigs.FirstOrDefaultAsync();
        if (config == null)
        {
            return Ok(new LeaveFetchConfigDto());
        }

        return Ok(new LeaveFetchConfigDto(
            Id: config.Id,
            Enabled: config.Enabled,
            Url: config.Url,
            Method: config.Method,
            IsFormUrlEncoded: config.IsFormUrlEncoded,
            Headers: JsonSerializer.Deserialize<Dictionary<string, string>>(config.HeadersJson) ?? new(),
            BodyTemplate: config.BodyTemplate,
            Mapping: JsonSerializer.Deserialize<MappingDto>(config.MappingJson) ?? new MappingDto()
        ));
    }

    [HttpPut]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Update([FromBody] LeaveFetchConfigDto dto)
    {
        var headers = dto.Headers ?? new Dictionary<string, string>();
        var mapping = dto.Mapping ?? new MappingDto();

        var config = await _db.LeaveFetchConfigs.FirstOrDefaultAsync();
        if (config == null)
        {
            config = new LeaveFetchConfig
            {
                Enabled = dto.Enabled,
                Url = dto.Url,
                Method = dto.Method,
                IsFormUrlEncoded = dto.IsFormUrlEncoded,
                HeadersJson = JsonSerializer.Serialize(headers),
                BodyTemplate = dto.BodyTemplate,
                MappingJson = JsonSerializer.Serialize(mapping)
            };
            _db.LeaveFetchConfigs.Add(config);
        }
        else
        {
            config.Enabled = dto.Enabled;
            config.Url = dto.Url;
            config.Method = dto.Method;
            config.IsFormUrlEncoded = dto.IsFormUrlEncoded;
            config.HeadersJson = JsonSerializer.Serialize(headers);
            config.BodyTemplate = dto.BodyTemplate;
            config.MappingJson = JsonSerializer.Serialize(mapping);
            config.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await _db.SaveChangesAsync();
        return Ok();
    }
}

public record LeaveFetchConfigDto(
    Guid? Id = null,
    bool Enabled = false,
    string Url = "",
    string Method = "POST",
    bool IsFormUrlEncoded = true,
    Dictionary<string, string>? Headers = null,
    string BodyTemplate = "",
    MappingDto? Mapping = null
);

public record MappingDto(
    string NamePath = "title",
    string StartPath = "start",
    string EndPath = "end",
    string TypePath = "type",
    string DaysPath = "totalDays",
    string StatusPath = "status",
    string NameTransform = "ExtractBeforeDash"
);
