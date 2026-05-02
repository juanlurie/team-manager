namespace TeamManager.Api.Domain.Entities;

public class MemberTimesheetConfig
{
    public Guid TeamMemberId { get; set; }
    public string ExtraProjectsJson { get; set; } = "[]";
    public string ExtraCategoriesJson { get; set; } = "{}";
    public string QuickActionsJson { get; set; } = "[]";

    public TeamMember TeamMember { get; set; } = null!;
}
