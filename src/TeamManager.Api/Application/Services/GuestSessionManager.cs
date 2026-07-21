using System.Collections.Concurrent;
using System.Security.Cryptography;
using Microsoft.AspNetCore.DataProtection;

namespace TeamManager.Api.Application.Services;

/// <summary>
/// A per-feature scope for a guest session cookie. Keeping the cookie name, path, and Data-Protection
/// purpose distinct per feature means a Win of the Week guest cookie is never sent to (or valid for)
/// the retro guest endpoints and vice-versa.
/// </summary>
public sealed record GuestSessionScope(string CookieName, string CookiePath, string ProtectorPurpose)
{
    public static readonly GuestSessionScope Wow = new("wow_gsid", "/api/v1/guest/wow", "wow-guest-session.v1");
    public static readonly GuestSessionScope Retro = new("retro_gsid", "/api/v1/guest/retro-board", "retro-guest-session.v1");
}

/// <summary>
/// Issues and reads an anonymous guest's session id from a signed, httpOnly cookie, scoped per feature
/// (see <see cref="GuestSessionScope"/>). Originally Win of the Week only; generalized so any feature
/// with a guest-join flow (retro, …) gets the same guarantees instead of re-deriving them.
///
/// The guest ownership/cap model (one vote per person, edit only your own contribution, …) hangs off
/// this id. It used to be a client-supplied query param, so a guest could reset every cap by sending a
/// fresh id and impersonate another by sending theirs. Now the server mints the id and hands it back
/// only inside a Data-Protection-signed, httpOnly cookie:
///   • httpOnly     — page script can't read or rotate it,
///   • signed       — a hand-crafted request can't forge a valid id,
///   • never echoed — the id appears in no response body or broadcast, so it can't be targeted.
/// A determined guest can still clear their own cookie to reset their own caps; that's inherent to
/// anonymous access and out of scope — this closes the trivial rotate/impersonate holes.
/// </summary>
public sealed class GuestSessionManager(IDataProtectionProvider dataProtectionProvider)
{
    private static readonly TimeSpan Lifetime = TimeSpan.FromDays(60);

    // One protector per purpose string, created lazily and reused (a scope's purpose is fixed).
    private readonly ConcurrentDictionary<string, IDataProtector> _protectors = new();

    private IDataProtector Protector(GuestSessionScope scope) =>
        _protectors.GetOrAdd(scope.ProtectorPurpose, dataProtectionProvider.CreateProtector);

    /// <summary>Returns the caller's guest session id for the given scope, minting one (and setting the
    /// cookie on the response) when there isn't a valid one yet.</summary>
    public string GetOrIssue(HttpContext ctx, GuestSessionScope scope)
    {
        var protector = Protector(scope);
        if (ctx.Request.Cookies.TryGetValue(scope.CookieName, out var signed) && !string.IsNullOrEmpty(signed))
        {
            try { return protector.Unprotect(signed); }
            catch (CryptographicException) { /* tampered, or the key ring rotated — reissue below */ }
        }

        var sessionId = Guid.NewGuid().ToString("N");
        ctx.Response.Cookies.Append(scope.CookieName, protector.Protect(sessionId), new CookieOptions
        {
            HttpOnly = true,
            Secure = ctx.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = scope.CookiePath,
            MaxAge = Lifetime,
            IsEssential = true
        });
        return sessionId;
    }

    /// <summary>Reads the caller's guest session id for the scope without minting one. Null when the
    /// caller has no valid cookie yet — used where a missing guest identity is a real answer (e.g.
    /// "have you joined?") rather than a reason to start a session.</summary>
    public string? TryRead(HttpContext ctx, GuestSessionScope scope)
    {
        if (ctx.Request.Cookies.TryGetValue(scope.CookieName, out var signed) && !string.IsNullOrEmpty(signed))
        {
            try { return Protector(scope).Unprotect(signed); }
            catch (CryptographicException) { return null; }
        }
        return null;
    }
}
