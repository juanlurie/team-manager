using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/timesheet-defaults")]
[Authorize]
public class TimesheetDefaultsController(AppDbContext db) : ControllerBase
{
    private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var config = await db.TimesheetSystemConfigs.FindAsync(1);
        return Ok(ToDto(config));
    }

    [HttpPut]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Update([FromBody] TimesheetDefaultsDto dto)
    {
        var config = await db.TimesheetSystemConfigs.FindAsync(1);
        if (config is null)
        {
            config = new Domain.Entities.TimesheetSystemConfig();
            db.TimesheetSystemConfigs.Add(config);
        }

        config.DefaultProjectsJson = JsonSerializer.Serialize(dto.Projects ?? []);
        config.DefaultCategoriesJson = JsonSerializer.Serialize(dto.Categories ?? new());
        config.CorrelationIdsJson = JsonSerializer.Serialize(dto.CorrelationIds ?? new());
        config.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync();
        return Ok(ToDto(config));
    }

    private static TimesheetDefaultsDto ToDto(Domain.Entities.TimesheetSystemConfig? config) => config is null
        ? new([], new(), new())
        : new(
            JsonSerializer.Deserialize<List<string>>(config.DefaultProjectsJson, Json) ?? [],
            JsonSerializer.Deserialize<Dictionary<string, List<string>>>(config.DefaultCategoriesJson, Json) ?? new(),
            JsonSerializer.Deserialize<Dictionary<string, string>>(
                string.IsNullOrWhiteSpace(config.CorrelationIdsJson) ? "{}" : config.CorrelationIdsJson, Json) ?? new()
        );
}

public record TimesheetDefaultsDto(
    List<string> Projects,
    Dictionary<string, List<string>> Categories,
    Dictionary<string, string> CorrelationIds
);
