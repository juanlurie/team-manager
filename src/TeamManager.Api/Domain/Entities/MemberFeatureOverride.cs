namespace TeamManager.Api.Domain.Entities;

public class MemberFeatureOverride
{
    public Guid Id { get; set; }
    public Guid TeamMemberId { get; set; }
    public string FeatureKey { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }

    public TeamMember TeamMember { get; set; } = null!;
}
