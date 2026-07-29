namespace TeamManager.Api.Application.Services;

/// <summary>
/// Per-week budgets for Win of the Week. The live values are per-series and host-configurable (see
/// <see cref="Domain.Entities.WinSeries"/>); these are the defaults a new series starts from, and the
/// fallback for a week whose series isn't loaded. Single source of truth: both WinOfTheWeekService
/// and GuestWinOfTheWeekService enforce these, and they used to each declare their own copy — so a
/// rule change had to be made in two places or the member and guest paths would silently diverge.
/// </summary>
public static class WinOfTheWeekLimits
{
    public const int DefaultMaxNominationsPerPerson = 3;
    public const int DefaultMaxVotesPerPerson = 3;

    /// <summary>Bounds a host can set a budget to. Zero would close the week to everyone, and the
    /// upper bound keeps a stray keystroke from handing out hundreds of votes.</summary>
    public const int MinPerPerson = 1;
    public const int MaxPerPerson = 20;

    public static int Clamp(int value) => Math.Clamp(value, MinPerPerson, MaxPerPerson);
}
