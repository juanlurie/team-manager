namespace TeamManager.Api.Application.DTOs.RetroBoard;

/// <summary>
/// Outcome of a RetroBoard mutation, mapped to a consistent HTTP status by the controller:
/// <list type="bullet">
/// <item><see cref="Ok"/> → 200/204</item>
/// <item><see cref="NotFound"/> → 404 (session or child entity doesn't exist)</item>
/// <item><see cref="Forbidden"/> → 403 (caller isn't an enrolled participant / facilitator as required)</item>
/// <item><see cref="Closed"/> → 409 (the retro is closed; reopen first)</item>
/// <item><see cref="Conflict"/> → 409 (a business rule blocks it, e.g. vote budget exhausted)</item>
/// <item><see cref="Invalid"/> → 400 (malformed input)</item>
/// </list>
/// This replaces the previous mix of null→404 and (bool,error)→409 signalling.
/// </summary>
public enum RetroActionResult
{
    Ok,
    NotFound,
    Forbidden,
    Closed,
    Conflict,
    Invalid,
}
