using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.ApiKey;

public record CreateApiKeyRequest(
    [Required] string Name,
    Guid? TeamMemberId = null,
    DateTimeOffset? ExpiresAt = null
);

public record ApiKeyResponse(
    Guid Id,
    string Name,
    Guid TeamMemberId,
    string TeamMemberName,
    string Role,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ExpiresAt,
    DateTimeOffset? LastUsedAt
);

public record CreatedApiKeyResult(
    Guid Id,
    string Name,
    string RawKey,
    Guid TeamMemberId,
    string TeamMemberName,
    string Role,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ExpiresAt
);
