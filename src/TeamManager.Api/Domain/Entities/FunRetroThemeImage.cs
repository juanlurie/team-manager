namespace TeamManager.Api.Domain.Entities;

// One row per session, keyed by SessionId (no surrogate Id) -- a session has at most one custom
// theme image, and re-uploading replaces it rather than accumulating history. Kept in its own
// table (not columns on FunRetroSession) so the image bytes never ride along with the session
// row on every GetSession/silentRefresh fetch; only the dedicated theme-image endpoint touches it.
public class FunRetroThemeImage
{
    public Guid SessionId { get; set; }
    public byte[] Data { get; set; } = [];
    public string ContentType { get; set; } = "image/png";
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public FunRetroSession Session { get; set; } = null!;
}
