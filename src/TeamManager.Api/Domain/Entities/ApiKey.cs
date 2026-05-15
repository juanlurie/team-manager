namespace TeamManager.Api.Domain.Entities;

public class ApiKey
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    /// <summary>SHA-256 hash of the raw key. Never stored in plaintext.</summary>
    public string KeyHash { get; set; } = string.Empty;
    public Guid TeamMemberId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ExpiresAt { get; set; }
    public DateTimeOffset? LastUsedAt { get; set; }

    public TeamMember TeamMember { get; set; } = null!;
}
