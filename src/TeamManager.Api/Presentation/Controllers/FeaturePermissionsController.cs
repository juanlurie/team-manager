using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.FeaturePermissions;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/feature-permissions")]
public class FeaturePermissionsController : ControllerBase
{
    private readonly IFeaturePermissionService service;

    public FeaturePermissionsController(IFeaturePermissionService service)
    {
        this.service = service;
    }

    [HttpGet("roles")]
    public async Task<IActionResult> GetAllRolePermissions()
    {
        var permissions = await service.GetAllRolePermissionsAsync();
        return Ok(permissions);
    }

    [HttpPut("roles/{featureKey}/{role}")]
    public async Task<IActionResult> UpdateRolePermission(string featureKey, string role, [FromBody] UpdateFeaturePermissionRequest request)
    {
        await service.UpdateRolePermissionAsync(featureKey, role, request.IsEnabled);
        return Ok();
    }

    [HttpGet("members/{memberId}")]
    public async Task<IActionResult> GetMemberOverrides(Guid memberId)
    {
        var overrides = await service.GetMemberOverridesAsync(memberId);
        return Ok(overrides);
    }

    [HttpPut("members/{memberId}")]
    public async Task<IActionResult> UpdateMemberOverride(Guid memberId, [FromBody] UpdateMemberFeatureOverrideRequest request)
    {
        await service.UpdateMemberOverrideAsync(memberId, request.FeatureKey, request.IsEnabled);
        return Ok();
    }

    [HttpDelete("members/{memberId}/{featureKey}")]
    public async Task<IActionResult> RemoveMemberOverride(Guid memberId, string featureKey)
    {
        await service.RemoveMemberOverrideAsync(memberId, featureKey);
        return NoContent();
    }

    [HttpGet("members/{memberId}/check/{featureKey}")]
    public async Task<IActionResult> CheckFeatureAccess(Guid memberId, string featureKey)
    {
        var enabled = await service.IsFeatureEnabledForMemberAsync(memberId, featureKey);
        return Ok(new { featureKey, isEnabled = enabled });
    }
}
