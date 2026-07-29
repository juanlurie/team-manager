namespace TeamManager.Api.Domain.Entities;

public class WinSeries
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid CreatedByMemberId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public bool PowerUpsEnabled { get; set; } = true;
    public bool HideVoteCounts { get; set; } = false;
    // Per-person weekly budgets, host-configurable. Defaults in WinOfTheWeekLimits.
    public int MaxNominationsPerPerson { get; set; } = Application.Services.WinOfTheWeekLimits.DefaultMaxNominationsPerPerson;
    public int MaxVotesPerPerson { get; set; } = Application.Services.WinOfTheWeekLimits.DefaultMaxVotesPerPerson;

    public TeamMember? CreatedBy { get; set; }
    public ICollection<WinWeek> Weeks { get; set; } = [];
}
