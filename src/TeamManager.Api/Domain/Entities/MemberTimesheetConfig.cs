namespace TeamManager.Api.Domain.Entities;

public class MemberTimesheetConfig
{
    public Guid TeamMemberId { get; set; }
    public string ExtraProjectsJson { get; set; } = "[]";
    public string ExtraCategoriesJson { get; set; } = "{}";
    public string QuickActionsJson { get; set; } = "[]";
    public string WorkLocationOptionsJson { get; set; } = "[\"Home\",\"Client\",\"Other\"]";
    public string BillableProjectsJson { get; set; } = "[]";
    public string WorkWeekJson { get; set; } = "{}";
    public bool MergeEntriesEnabled { get; set; } = false;
    public string LocationIconsJson { get; set; } = "{}";
    public string CategoryCorrelationIdsJson { get; set; } = "{}";
    public string? ExternalEmployeeId { get; set; }
    public string WorkLocationCorrelationIdsJson { get; set; } = "{}";
    public bool DeduplicatePendingEditSync { get; set; } = false;
    public string? CalendarDefaultProject { get; set; }
    public string? CalendarDefaultCategory { get; set; }

    public TeamMember TeamMember { get; set; } = null!;
}
