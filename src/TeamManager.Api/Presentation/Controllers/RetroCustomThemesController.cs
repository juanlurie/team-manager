using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.FunRetro;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

// Team-wide library of custom retro board themes, shared across every session -- selectable from
// any retro's theme picker alongside the fixed built-in themes. Gated by the same "retro" feature
// flag as FunRetroController; any member with that access can create/edit/delete a theme or its
// images, since this is meant to be a shared library rather than something only its creator owns.
[ApiController]
[RequireFeature("retro")]
[Route("api/v1/retro-themes")]
public class RetroCustomThemesController(RetroCustomThemeService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetThemes()
    {
        return Ok(await service.GetThemesAsync());
    }

    [HttpPost]
    public async Task<IActionResult> CreateTheme([FromBody] CreateRetroCustomThemeRequest request)
    {
        var memberId = GetCurrentMemberId();
        if (!memberId.HasValue) return Unauthorized();

        var theme = await service.CreateThemeAsync(memberId.Value, request.Name);
        return Ok(theme);
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> RenameTheme(Guid id, [FromBody] RenameRetroCustomThemeRequest request)
    {
        var success = await service.RenameThemeAsync(id, request.Name);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteTheme(Guid id)
    {
        var success = await service.DeleteThemeAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPatch("{id:guid}/override")]
    public async Task<IActionResult> SetOverride(Guid id, [FromBody] SetOverrideBuiltInRequest request)
    {
        if (request.BuiltInId is not null && !RetroCustomThemeService.ValidBuiltInIds.Contains(request.BuiltInId))
            return BadRequest(new { error = "Unknown built-in theme id." });

        var (success, conflict) = await service.SetOverrideBuiltInAsync(id, request.BuiltInId);
        if (conflict) return Conflict(new { error = "Another theme already overrides this built-in theme." });
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPost("{id:guid}/variants/{variant}")]
    [RequestSizeLimit(RetroCustomThemeService.MaxImageBytes)]
    public async Task<IActionResult> UploadVariant(Guid id, string variant, IFormFile file)
    {
        if (!RetroCustomThemeService.IsValidVariant(variant)) return BadRequest(new { error = "Invalid variant key." });
        if (file.Length <= 0 || file.Length > RetroCustomThemeService.MaxImageBytes
            || !RetroCustomThemeService.AllowedContentTypes.Contains(file.ContentType))
            return BadRequest(new { error = "Image must be PNG/JPEG/WEBP/GIF, up to 5MB." });

        await using var stream = file.OpenReadStream();
        var updatedAt = await service.UploadVariantImageAsync(id, variant, file.ContentType, stream);
        if (updatedAt is null) return NotFound();
        return Ok(new { updatedAt });
    }

    [HttpGet("{id:guid}/variants/{variant}")]
    public async Task<IActionResult> GetVariant(Guid id, string variant)
    {
        var image = await service.GetVariantImageAsync(id, variant);
        if (image is null) return NotFound();
        return File(image.Value.Data, image.Value.ContentType);
    }

    [HttpDelete("{id:guid}/variants/{variant}")]
    public async Task<IActionResult> DeleteVariant(Guid id, string variant)
    {
        var success = await service.DeleteVariantImageAsync(id, variant);
        if (!success) return NotFound();
        return NoContent();
    }

    private Guid? GetCurrentMemberId()
    {
        var claim = User.FindFirst("TMID")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
