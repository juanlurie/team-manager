namespace TeamManager.Api.Domain.Entities;

public class FeaturePermission
{
    public Guid Id { get; set; }
    public string FeatureKey { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;
}
