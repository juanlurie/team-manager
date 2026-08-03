using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Domain.Entities;

/// <summary>
/// Audit trail for role changes -- "who made this person an Admin, and when". Written only by
/// the dedicated role endpoint, which is the sole path that may change <see cref="TeamMember.Role"/>.
/// </summary>
public class MemberRoleChange
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MemberId { get; set; }
    /// <summary>The member who made the change. Null only for changes made outside a request.</summary>
    public Guid? ActorId { get; set; }
    public MemberRole FromRole { get; set; }
    public MemberRole ToRole { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
