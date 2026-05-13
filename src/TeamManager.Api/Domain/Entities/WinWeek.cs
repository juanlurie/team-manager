using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Domain.Entities;

public class WinWeek
{
    public Guid Id { get; set; }
    public DateOnly WeekStart { get; set; }
    public WinWeekStatus Status { get; set; } = WinWeekStatus.Nominating;
    public Guid? WinnerNominationId { get; set; }
    public DateTimeOffset OpenedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ClosedAt { get; set; }

    public WinNomination? Winner { get; set; }
    public ICollection<WinNomination> Nominations { get; set; } = [];
}
