using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/config-variables")]
[Authorize]
[RequireFeature("settings")]
public class ConfigVariablesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var vars = await db.ConfigVariables.OrderBy(v => v.Key).ToListAsync();
        return Ok(vars.Select(ToDto));
    }

    [HttpGet("keys")]
    public async Task<IActionResult> Keys()
    {
        var keys = await db.ConfigVariables.Select(v => v.Key).OrderBy(k => k).ToListAsync();
        return Ok(keys);
    }

    [HttpPost]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Create([FromBody] ConfigVariableDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Key))
            return BadRequest("Key is required");

        if (await db.ConfigVariables.AnyAsync(v => v.Key == dto.Key))
            return Conflict($"A variable with key '{dto.Key}' already exists");

        var variable = new ConfigVariable
        {
            Key = dto.Key.Trim(),
            Value = dto.Value,
            Description = dto.Description,
            IsSecret = dto.IsSecret
        };

        db.ConfigVariables.Add(variable);
        await db.SaveChangesAsync();
        return Ok(ToDto(variable));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Update(Guid id, [FromBody] ConfigVariableDto dto)
    {
        var variable = await db.ConfigVariables.FindAsync(id);
        if (variable == null) return NotFound();

        if (await db.ConfigVariables.AnyAsync(v => v.Key == dto.Key.Trim() && v.Id != id))
            return Conflict($"A variable with key '{dto.Key}' already exists");

        variable.Key = dto.Key.Trim();
        variable.Description = dto.Description;
        variable.IsSecret = dto.IsSecret;
        if (dto.Value != "**SECRET**")
            variable.Value = dto.Value;
        variable.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync();
        return Ok(ToDto(variable));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var variable = await db.ConfigVariables.FindAsync(id);
        if (variable == null) return NotFound();

        db.ConfigVariables.Remove(variable);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static ConfigVariableDto ToDto(ConfigVariable v) => new(
        Id: v.Id,
        Key: v.Key,
        Value: v.IsSecret ? "**SECRET**" : v.Value,
        Description: v.Description,
        IsSecret: v.IsSecret
    );
}
