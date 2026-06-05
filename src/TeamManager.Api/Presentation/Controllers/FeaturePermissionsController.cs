using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.FeaturePermissions;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/feature-permissions")]
public class FeaturePermissionsController : ControllerBase
{
    private readonly IFeaturePermissionService service;
    private readonly AppDbContext db;

    public FeaturePermissionsController(IFeaturePermissionService service, AppDbContext db)
    {
        this.service = service;
        this.db = db;
    }

    [HttpGet("roles")]
    [RequireFeature("settings")]
    public async Task<IActionResult> GetAllRolePermissions()
    {
        var permissions = await service.GetAllRolePermissionsAsync();
        return Ok(permissions);
    }

    [HttpPut("roles/{featureKey}/{role}")]
    [RequireFeature("settings")]
    public async Task<IActionResult> UpdateRolePermission(string featureKey, string role, [FromBody] UpdateFeaturePermissionRequest request)
    {
        await service.UpdateRolePermissionAsync(featureKey, role, request.IsEnabled);
        return Ok();
    }

    [HttpGet("members/{memberId}")]
    [RequireFeature("settings")]
    public async Task<IActionResult> GetMemberOverrides(Guid memberId)
    {
        var overrides = await service.GetMemberOverridesAsync(memberId);
        return Ok(overrides);
    }

    [HttpPut("members/{memberId}")]
    [RequireFeature("settings")]
    public async Task<IActionResult> UpdateMemberOverride(Guid memberId, [FromBody] UpdateMemberFeatureOverrideRequest request)
    {
        await service.UpdateMemberOverrideAsync(memberId, request.FeatureKey, request.IsEnabled);
        return Ok();
    }

    [HttpDelete("members/{memberId}/{featureKey}")]
    [RequireFeature("settings")]
    public async Task<IActionResult> RemoveMemberOverride(Guid memberId, string featureKey)
    {
        await service.RemoveMemberOverrideAsync(memberId, featureKey);
        return NoContent();
    }

    [HttpGet("members/{memberId}/check/{featureKey}")]
    [RequireFeature("settings")]
    public async Task<IActionResult> CheckFeatureAccess(Guid memberId, string featureKey)
    {
        var enabled = await service.IsFeatureEnabledForMemberAsync(memberId, featureKey);
        return Ok(new { featureKey, isEnabled = enabled });
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMyPermissions()
    {
        var memberId = HttpContext.GetCurrentMemberId();
        if (memberId == Guid.Empty)
            return Unauthorized();

        var member = await db.TeamMembers.FindAsync(memberId);
        if (member == null)
            return NotFound(new { error = "Team member not found." });

        var permissions = await service.GetMemberOverridesAsync(memberId);
        return Ok(new
        {
            memberId,
            role = member.Role.ToString(),
            permissions = permissions.Select(p => new { p.FeatureKey, p.IsEnabled })
        });
    }

    [HttpGet("me/check/{featureKey}")]
    public async Task<IActionResult> CheckMyFeatureAccess(string featureKey)
    {
        var memberId = HttpContext.GetCurrentMemberId();
        if (memberId == Guid.Empty)
            return Unauthorized();

        var enabled = await service.IsFeatureEnabledForMemberAsync(memberId, featureKey);
        return Ok(new { featureKey, isEnabled = enabled });
    }
}
