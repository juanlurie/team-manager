using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.CoffeeRun;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/coffee-runs")]
public class CoffeeRunsController(ICoffeeRunService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await service.GetAllAsync());

    [HttpPost]
    public async Task<IActionResult> Create([FromQuery] Guid? copyMenuFromRunId, [FromQuery] Guid? fromTemplateId)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var initiatorId))
            return Unauthorized();

        var result = await service.CreateAsync(initiatorId, copyMenuFromRunId, fromTemplateId);
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

    [HttpPost("{id:guid}/close")]
    public async Task<IActionResult> Close(Guid id)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var currentUserId))
            return Unauthorized();

        var result = await service.CloseAsync(id, currentUserId);
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
            DeleteMenuItemResult.HasOrders => BadRequest("Cannot delete a menu item that has been ordered."),
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

    [HttpGet("/api/v1/coffee-run-menu-templates")]
    public async Task<IActionResult> GetTemplates()
        => Ok(await service.GetTemplatesAsync());

    [HttpPost("/api/v1/coffee-run-menu-templates")]
    public async Task<IActionResult> CreateTemplate([FromBody] CreateMenuTemplateRequest request)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var memberId))
            return Unauthorized();

        var result = await service.CreateTemplateAsync(memberId, request);
        return Created("", result);
    }

    [HttpDelete("/api/v1/coffee-run-menu-templates/{templateId:guid}")]
    public async Task<IActionResult> DeleteTemplate(Guid templateId)
    {
        var tmid = User.FindFirst("TMID")?.Value;
        if (tmid is null || !Guid.TryParse(tmid, out var memberId))
            return Unauthorized();

        var success = await service.DeleteTemplateAsync(templateId, memberId);
        return success ? NoContent() : NotFound();
    }
}
