using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Domain.Entities;

public class Invitation
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public MemberRole Role { get; set; }
    public DateTime SentAt { get; set; }
    public DateTime? AcceptedAt { get; set; }
    public string? ExternalSubjectId { get; set; }
}
