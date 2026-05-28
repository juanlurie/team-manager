using TeamManager.Api.Application.DTOs.FeaturePermissions;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface IFeaturePermissionService
{
    Task<List<FeatureCategoryGroup>> GetAllRolePermissionsAsync();
    Task UpdateRolePermissionAsync(string featureKey, string role, bool isEnabled);
    Task<List<MemberFeatureOverrideDto>> GetMemberOverridesAsync(Guid memberId);
    Task UpdateMemberOverrideAsync(Guid memberId, string featureKey, bool isEnabled);
    Task RemoveMemberOverrideAsync(Guid memberId, string featureKey);
    Task<bool> IsFeatureEnabledForMemberAsync(Guid memberId, string featureKey);
}
