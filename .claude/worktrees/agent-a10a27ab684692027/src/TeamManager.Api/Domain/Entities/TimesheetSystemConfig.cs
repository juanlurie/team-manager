namespace TeamManager.Api.Domain.Entities;

public class TimesheetSystemConfig
{
    public int Id { get; set; } = 1; // singleton
    public string DefaultProjectsJson { get; set; } = "[]";
    public string DefaultCategoriesJson { get; set; } = "{}";
    public string CorrelationIdsJson { get; set; } = "{}";
    public string CustomFieldValuesJson { get; set; } = "{}";
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
