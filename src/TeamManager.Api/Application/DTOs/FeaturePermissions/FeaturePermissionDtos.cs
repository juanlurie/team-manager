namespace TeamManager.Api.Application.DTOs.FeaturePermissions;

public record FeaturePermissionDto(
    Guid Id,
    string FeatureKey,
    string Category,
    string Label,
    string Role,
    bool IsEnabled
);

public record FeatureCategoryGroup(
    string Category,
    List<FeaturePermissionDto> Permissions
);

public record UpdateFeaturePermissionRequest(
    bool IsEnabled
);

public record MemberFeatureOverrideDto(
    Guid Id,
    string FeatureKey,
    string Category,
    string Label,
    bool IsEnabled,
    bool RoleDefault
);

public record UpdateMemberFeatureOverrideRequest(
    string FeatureKey,
    bool IsEnabled
);
