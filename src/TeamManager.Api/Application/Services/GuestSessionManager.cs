using System.Security.Cryptography;
using Microsoft.AspNetCore.DataProtection;

namespace TeamManager.Api.Application.Services;

/// <summary>
/// Issues and reads the anonymous guest's Win of the Week session id from a signed, httpOnly cookie.
///
/// The guest ownership/cap model (one vote per person, edit only your own nomination, one card per
/// week) hangs off this id. It used to be a client-supplied query param, so a guest could reset every
/// cap by sending a fresh id and impersonate another by sending theirs. Now the server mints the id
/// and hands it back only inside a Data-Protection-signed, httpOnly cookie:
///   • httpOnly     — page script can't read or rotate it,
///   • signed       — a hand-crafted request can't forge a valid id,
///   • never echoed — the id appears in no response body or broadcast, so it can't be targeted.
/// A determined guest can still clear their own cookie to reset their own caps; that's inherent to
/// anonymous access and out of scope — this closes the trivial rotate/impersonate holes.
/// </summary>
public sealed class GuestSessionManager(IDataProtectionProvider dataProtectionProvider)
{
    private const string CookieName = "wow_gsid";
    private const string CookiePath = "/api/v1/guest/wow";
    private static readonly TimeSpan Lifetime = TimeSpan.FromDays(60);

    private readonly IDataProtector _protector = dataProtectionProvider.CreateProtector("wow-guest-session.v1");

    /// <summary>Returns the caller's guest session id, minting one (and setting the cookie on the
    /// response) when there isn't a valid one yet.</summary>
    public string GetOrIssue(HttpContext ctx)
    {
        if (ctx.Request.Cookies.TryGetValue(CookieName, out var signed) && !string.IsNullOrEmpty(signed))
        {
            try { return _protector.Unprotect(signed); }
            catch (CryptographicException) { /* tampered, or the key ring rotated — reissue below */ }
        }

        var sessionId = Guid.NewGuid().ToString("N");
        ctx.Response.Cookies.Append(CookieName, _protector.Protect(sessionId), new CookieOptions
        {
            HttpOnly = true,
            Secure = ctx.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = CookiePath,
            MaxAge = Lifetime,
            IsEssential = true
        });
        return sessionId;
    }
}
