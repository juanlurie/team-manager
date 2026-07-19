using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Application.Services;

/// <summary>The two kinds of card a voter can play on a rival nomination.</summary>
public enum WowCardKind { PowerUp, ChaosCard }

/// <summary>
/// Single source of truth for the valid card types and the small kind-specific bits (field,
/// display nouns) shared by the member and guest card paths. The valid-type sets used to be
/// re-declared inline in all four Apply*Card methods; a rule change had to be made in four places.
/// The token spend and DTO mapping deliberately stay with the callers — those genuinely differ
/// (member weekly token vs guest one-card-per-session; WinNominationDto vs GuestNominationDto).
/// </summary>
public static class WowCards
{
    public static readonly IReadOnlySet<string> PowerUpTypes = new HashSet<string> { "Spotlight" };
    public static readonly IReadOnlySet<string> ChaosCardTypes = new HashSet<string> { "TinyText", "Autocorrect", "RandomCase", "Hangman" };

    public static IReadOnlySet<string> TypesFor(WowCardKind kind) =>
        kind == WowCardKind.PowerUp ? PowerUpTypes : ChaosCardTypes;

    /// <summary>Lowercase noun for messages, e.g. "power-up" / "chaos card".</summary>
    public static string Noun(WowCardKind kind) => kind == WowCardKind.PowerUp ? "power-up" : "chaos card";

    /// <summary>Capitalised plural for the "… can only be applied during voting" message.</summary>
    public static string Plural(WowCardKind kind) => kind == WowCardKind.PowerUp ? "Power-ups" : "Chaos cards";

    public static bool IsApplied(WinNomination nomination, WowCardKind kind) =>
        kind == WowCardKind.PowerUp ? nomination.PowerUp is not null : nomination.ChaosCard is not null;

    public static void Set(WinNomination nomination, WowCardKind kind, string type)
    {
        if (kind == WowCardKind.PowerUp) nomination.PowerUp = type;
        else nomination.ChaosCard = type;
    }
}
