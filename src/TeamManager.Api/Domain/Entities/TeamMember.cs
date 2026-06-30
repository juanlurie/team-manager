using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Domain.Entities;

public class TeamMember
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public MemberRole Role { get; set; }
    public Guid? TeamLeadId { get; set; }
    public List<string> Crafts { get; set; } = [];
    public string? ExternalSubjectId { get; set; }
    public string? AvatarSeed { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateOnly? BirthDate { get; set; }
    public DateOnly? JoinDate { get; set; }

    public TeamMember? TeamLead { get; set; }
    public ICollection<TeamMember> DirectReports { get; set; } = [];
    public ICollection<SprintMember> SprintMemberships { get; set; } = [];
    public ICollection<LeaveRecord> LeaveRecords { get; set; } = [];
    public ICollection<MemberAchievement> Achievements { get; set; } = [];
    public ICollection<PointAward> PointAwards { get; set; } = [];
    public ICollection<SquadMember> SquadMemberships { get; set; } = [];
}
