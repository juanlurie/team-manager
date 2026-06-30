using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Domain.Entities;

public class GoogleCalendarToken
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TeamMemberId { get; set; }
    public TeamMember TeamMember { get; set; } = null!;
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public DateTimeOffset TokenExpiry { get; set; }
    public string AccountEmail { get; set; } = string.Empty;
    public DateTimeOffset ConnectedAt { get; set; } = DateTimeOffset.UtcNow;
}
