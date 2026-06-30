using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("settings")]
[Route("api/v1/ai-prompts")]
[Authorize]
public class AiPromptsController(AppDbContext db, AiPromptExecutorService executor) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var prompts = await db.AiPrompts.Include(p => p.Connection)
            .OrderBy(p => p.Label)
            .ToListAsync();
        return Ok(prompts.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var prompt = await db.AiPrompts.Include(p => p.Connection).FirstOrDefaultAsync(p => p.Id == id);
        if (prompt is null) return NotFound();
        return Ok(ToDto(prompt));
    }

    [HttpPost]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Create([FromBody] AiPromptDto dto)
    {
        var prompt = new AiPrompt
        {
            Key = dto.Key,
            Label = dto.Label,
            SystemPrompt = dto.SystemPrompt,
            UserMessageTemplate = dto.UserMessageTemplate,
            Enabled = dto.Enabled,
            ConnectionId = dto.ConnectionId,
        };
        db.AiPrompts.Add(prompt);
        await db.SaveChangesAsync();
        await db.Entry(prompt).Reference(p => p.Connection).LoadAsync();
        return Ok(ToDto(prompt));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Update(Guid id, [FromBody] AiPromptDto dto)
    {
        var prompt = await db.AiPrompts.FindAsync(id);
        if (prompt is null) return NotFound();

        prompt.Key = dto.Key;
        prompt.Label = dto.Label;
        prompt.SystemPrompt = dto.SystemPrompt;
        prompt.UserMessageTemplate = dto.UserMessageTemplate;
        prompt.Enabled = dto.Enabled;
        prompt.ConnectionId = dto.ConnectionId;
        prompt.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync();
        await db.Entry(prompt).Reference(p => p.Connection).LoadAsync();
        return Ok(ToDto(prompt));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var prompt = await db.AiPrompts.FindAsync(id);
        if (prompt is null) return NotFound();
        db.AiPrompts.Remove(prompt);
        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("{id:guid}/test")]
    [Authorize(Roles = "TeamLead")]
    public async Task<IActionResult> Test(Guid id, [FromBody] TestAiPromptRequest request)
    {
        var prompt = await db.AiPrompts.Include(p => p.Connection).FirstOrDefaultAsync(p => p.Id == id);
        if (prompt is null) return NotFound();
        if (!prompt.Enabled)
            return Ok(new TestAiPromptResult(false, null, "This prompt is disabled — enable it first to test it."));
        if (prompt.Connection is null || !prompt.Connection.Enabled)
            return Ok(new TestAiPromptResult(false, null, "This prompt's connection is missing or disabled."));

        try
        {
            var extracted = await executor.ExecuteAsync(
                prompt.Key, request.PromptParams ?? new(), "AiPromptTest", $"Test — {prompt.Label}");
            return Ok(extracted is null
                ? new TestAiPromptResult(false, null, "Call failed or returned no usable text — check the Sync Queue for details.")
                : new TestAiPromptResult(true, extracted, null));
        }
        catch (Exception ex)
        {
            return Ok(new TestAiPromptResult(false, null, ex.Message));
        }
    }

    private static AiPromptDto ToDto(AiPrompt prompt) => new(
        Id: prompt.Id,
        Key: prompt.Key,
        Label: prompt.Label,
        SystemPrompt: prompt.SystemPrompt,
        UserMessageTemplate: prompt.UserMessageTemplate,
        Enabled: prompt.Enabled,
        ConnectionId: prompt.ConnectionId,
        ConnectionName: prompt.Connection?.Name
    );
}
