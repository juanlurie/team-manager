using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;
using TeamManager.Api.Application.Services;
using Xunit;

namespace TeamManager.Tests;

// The guest ownership/cap model trusts this session id, so the sign/read/reissue behaviour is the
// security boundary — exercised here with a real (ephemeral-key) Data Protection provider.
public class GuestSessionManagerTests
{
    private static GuestSessionManager NewManager() =>
        new(new EphemeralDataProtectionProvider());

    private static string CookieValueFrom(HttpContext ctx) =>
        SetCookieHeaderValue.Parse(ctx.Response.Headers.SetCookie.ToString()).Value.ToString();

    [Fact]
    public void Issues_a_session_and_sets_an_httponly_cookie()
    {
        var ctx = new DefaultHttpContext();

        var id = NewManager().GetOrIssue(ctx);

        Assert.False(string.IsNullOrEmpty(id));
        var cookie = SetCookieHeaderValue.Parse(ctx.Response.Headers.SetCookie.ToString());
        Assert.Equal("wow_gsid", cookie.Name.ToString());
        Assert.True(cookie.HttpOnly);
    }

    [Fact]
    public void Reads_back_the_same_id_from_the_signed_cookie()
    {
        var mgr = NewManager();
        var issueCtx = new DefaultHttpContext();
        var issuedId = mgr.GetOrIssue(issueCtx);

        var nextCtx = new DefaultHttpContext();
        nextCtx.Request.Headers.Cookie = $"wow_gsid={CookieValueFrom(issueCtx)}";

        // Same manager (same key ring) unprotects the cookie back to the original id, and doesn't
        // reissue a new cookie when a valid one is already present.
        Assert.Equal(issuedId, mgr.GetOrIssue(nextCtx));
        Assert.True(StringValues.IsNullOrEmpty(nextCtx.Response.Headers.SetCookie));
    }

    [Fact]
    public void Reissues_a_new_id_when_the_cookie_is_tampered()
    {
        var mgr = NewManager();
        var issuedId = mgr.GetOrIssue(new DefaultHttpContext());

        var ctx = new DefaultHttpContext();
        ctx.Request.Headers.Cookie = "wow_gsid=not-a-valid-protected-value";

        var reissued = mgr.GetOrIssue(ctx);
        Assert.NotEqual(issuedId, reissued);
        Assert.False(string.IsNullOrEmpty(reissued));
        Assert.False(StringValues.IsNullOrEmpty(ctx.Response.Headers.SetCookie));
    }

    [Fact]
    public void A_forged_id_cannot_be_injected_via_an_unsigned_cookie()
    {
        var mgr = NewManager();

        var ctx = new DefaultHttpContext();
        // An attacker setting a raw session id they picked (e.g. a victim's) — not Data-Protection
        // signed, so it must be rejected and a fresh server-issued id used instead.
        ctx.Request.Headers.Cookie = "wow_gsid=victim-session-guid";

        Assert.NotEqual("victim-session-guid", mgr.GetOrIssue(ctx));
    }
}
