using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.CoffeeRun;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/coffee-runs")]
public class CoffeeRunsController(ICoffeeRunService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null,
        [FromQuery] Guid? initiatorId = null,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null)
    {
        Guid? currentUserId = null;
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is not null && Guid.TryParse(tmid, out var uid))
            currentUserId = uid;

        return Ok(await service.GetAllAsync(page, pageSize, status, initiatorId, from, to, currentUserId));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRunRequest? body = null, [FromQuery] Guid? copyMenuFromRunId = null, [FromQuery] Guid? fromTemplateId = null)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var initiatorId))
            return Unauthorized();

        // Backward compatibility: support old query-param style
        if (body is null && (copyMenuFromRunId.HasValue || fromTemplateId.HasValue))
        {
            body = new CreateRunRequest(
                Title: null,
                Description: null,
                Location: null,
                OrderDeadline: null,
                TemplateId: fromTemplateId,
                CopyMenuFromRunId: copyMenuFromRunId
            );
        }

        var result = await service.CreateAsync(initiatorId, body);
        return Created("", result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var currentUserId))
            return Unauthorized();

        var result = await service.GetByIdAsync(id, currentUserId);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateRunRequest request)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var currentUserId))
            return Unauthorized();

        var isTeamLead = User.IsInRole("TeamLead");
        var result = await service.UpdateAsync(id, request, currentUserId, isTeamLead);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var currentUserId))
            return Unauthorized();

        var isTeamLead = User.IsInRole("TeamLead");
        var success = await service.DeleteAsync(id, currentUserId, isTeamLead);
        return success ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/publish")]
    public async Task<IActionResult> Publish(Guid id)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var currentUserId))
            return Unauthorized();

        var result = await service.PublishAsync(id, currentUserId);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("{id:guid}/close")]
    public async Task<IActionResult> Close(Guid id)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var currentUserId))
            return Unauthorized();

        var result = await service.CloseAsync(id, currentUserId);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var currentUserId))
            return Unauthorized();

        var isTeamLead = User.IsInRole("TeamLead");
        var result = await service.CancelAsync(id, currentUserId, isTeamLead);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("{id:guid}/summary")]
    public async Task<IActionResult> GetSummary(Guid id)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var currentUserId))
            return Unauthorized();

        var result = await service.GetSummaryAsync(id, currentUserId);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("{id:guid}/menu-items")]
    public async Task<IActionResult> AddMenuItem(Guid id, [FromBody] CreateMenuItemRequest request)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var currentUserId))
            return Unauthorized();

        var result = await service.AddMenuItemAsync(id, request, currentUserId);
        return result is null ? NotFound() : Created("", result);
    }

    [HttpPut("{id:guid}/menu-items/{itemId:guid}")]
    public async Task<IActionResult> UpdateMenuItem(Guid id, Guid itemId, [FromBody] UpdateMenuItemRequest request)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var currentUserId))
            return Unauthorized();

        var result = await service.UpdateMenuItemAsync(id, itemId, request, currentUserId);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPatch("{id:guid}/menu-items/{itemId:guid}/availability")]
    public async Task<IActionResult> ToggleAvailability(Guid id, Guid itemId)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var currentUserId))
            return Unauthorized();

        var result = await service.ToggleMenuItemAvailabilityAsync(id, itemId, currentUserId);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}/menu-items/{itemId:guid}")]
    public async Task<IActionResult> DeleteMenuItem(Guid id, Guid itemId)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var currentUserId))
            return Unauthorized();

        var result = await service.DeleteMenuItemAsync(id, itemId, currentUserId);
        return result switch
        {
            DeleteMenuItemResult.NotFound => NotFound(),
            DeleteMenuItemResult.HasOrders => Conflict("Cannot delete a menu item that has been ordered."),
            DeleteMenuItemResult.Success => NoContent(),
            _ => NotFound()
        };
    }

    [HttpPost("{id:guid}/orders")]
    public async Task<IActionResult> CreateOrder(Guid id, [FromBody] CreateOrderRequest request)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var currentUserId))
            return Unauthorized();

        var (result, isDuplicate) = await service.CreateOrderAsync(id, request, currentUserId);
        if (isDuplicate) return Conflict("You already have an order for this coffee run.");
        return result is null ? NotFound() : Created("", result);
    }

    [HttpPut("{id:guid}/orders/{orderId:guid}")]
    public async Task<IActionResult> UpdateOrder(Guid id, Guid orderId, [FromBody] UpdateOrderRequest request)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var currentUserId))
            return Unauthorized();

        var result = await service.UpdateOrderAsync(id, orderId, request, currentUserId);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}/orders/{orderId:guid}")]
    public async Task<IActionResult> DeleteOrder(Guid id, Guid orderId)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var currentUserId))
            return Unauthorized();

        var result = await service.DeleteOrderAsync(id, orderId, currentUserId);
        return result is null ? NotFound() : NoContent();
    }

    [HttpPatch("{id:guid}/orders/{orderId:guid}/status")]
    public async Task<IActionResult> UpdateOrderStatus(Guid id, Guid orderId, [FromBody] UpdateOrderStatusRequest request)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var currentUserId))
            return Unauthorized();

        var result = await service.UpdateOrderStatusAsync(id, orderId, request, currentUserId);
        return result is null ? NotFound() : Ok(result);
    }

    // ── Template endpoints (kept for backward compatibility, also in MenuTemplatesController) ──

    [HttpGet("/api/v1/coffee-run-menu-templates")]
    public async Task<IActionResult> GetTemplates()
    {
        var pagedResult = await service.GetTemplatesAsync();
        return Ok(pagedResult.Items);
    }

    [HttpGet("/api/v1/coffee-run-menu-templates/{templateId:guid}")]
    public async Task<IActionResult> GetTemplateDetail(Guid templateId)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var memberId))
            return Unauthorized();

        try
        {
            var result = await service.GetTemplateDetailAsync(templateId, memberId);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost("/api/v1/coffee-run-menu-templates")]
    public async Task<IActionResult> CreateTemplate([FromBody] CreateMenuTemplateRequest request)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var memberId))
            return Unauthorized();

        var result = await service.CreateTemplateAsync(memberId, request);
        return Created("", result);
    }

    [HttpPost("/api/v1/coffee-run-menu-templates/import")]
    public async Task<IActionResult> ImportTemplate([FromBody] ImportMenuTemplateRequest request)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var memberId))
            return Unauthorized();

        var result = await service.ImportTemplateAsync(memberId, request);
        return Created("", result);
    }

    [HttpPut("/api/v1/coffee-run-menu-templates/{templateId:guid}")]
    public async Task<IActionResult> UpdateTemplate(Guid templateId, [FromBody] UpdateMenuTemplateRequest request)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var memberId))
            return Unauthorized();

        try
        {
            var result = await service.UpdateTemplateAsync(templateId, memberId, request);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpDelete("/api/v1/coffee-run-menu-templates/{templateId:guid}")]
    public async Task<IActionResult> DeleteTemplate(Guid templateId)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var memberId))
            return Unauthorized();

        var isTeamLead = User.IsInRole("TeamLead");
        var success = await service.DeleteTemplateAsync(templateId, memberId, isTeamLead);
        return success ? NoContent() : NotFound();
    }

    [HttpPost("/api/v1/coffee-run-menu-templates/{templateId:guid}/items")]
    public async Task<IActionResult> AddTemplateItem(Guid templateId, [FromBody] CreateTemplateItemRequest request)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var memberId))
            return Unauthorized();

        try
        {
            var result = await service.AddTemplateItemAsync(templateId, memberId, request);
            return Created("", result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPut("/api/v1/coffee-run-menu-templates/{templateId:guid}/items/{itemId:guid}")]
    public async Task<IActionResult> UpdateTemplateItem(Guid templateId, Guid itemId, [FromBody] UpdateTemplateItemRequest request)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var memberId))
            return Unauthorized();

        try
        {
            var result = await service.UpdateTemplateItemAsync(templateId, itemId, memberId, request);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpDelete("/api/v1/coffee-run-menu-templates/{templateId:guid}/items/{itemId:guid}")]
    public async Task<IActionResult> DeleteTemplateItem(Guid templateId, Guid itemId)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var memberId))
            return Unauthorized();

        var success = await service.DeleteTemplateItemAsync(templateId, itemId, memberId);
        return success ? NoContent() : NotFound();
    }
}
