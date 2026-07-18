namespace TeamManager.Api.Application.Services;

/// <summary>
/// Per-week budgets for Win of the Week. Single source of truth: both WinOfTheWeekService and
/// GuestWinOfTheWeekService enforce these, and they used to each declare their own copy — so a rule
/// change had to be made in two places or the member and guest paths would silently diverge.
/// </summary>
public static class WinOfTheWeekLimits
{
    public const int MaxNominationsPerPerson = 3;
    public const int MaxVotesPerPerson = 3;
}
