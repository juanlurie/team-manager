namespace TeamManager.Api.Domain.Entities;

public class WowMemberToken
{
    public Guid Id { get; set; }
    public Guid TeamMemberId { get; set; }
    public Guid WinWeekId { get; set; }
    public string Source { get; set; } = "Weekly"; // "Weekly" | "WinnerBonus"
    public DateTimeOffset? SpentAt { get; set; }
    public Guid? SpentOnNominationId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public TeamMember TeamMember { get; set; } = null!;
    public WinWeek WinWeek { get; set; } = null!;
    public WinNomination? SpentOnNomination { get; set; }
}
