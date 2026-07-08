namespace TeamManager.Api.Domain.Entities;

// A variant image for a RetroCustomTheme -- either one of the 3 legacy tone names
// ("positive"/"negative"/"action", see RETRO_THEMES in the frontend's retro-constants.ts) or, for
// newer per-column themes, an actual RetroColumn.key ("well", "start", "wind", ...). Keyed by
// (ThemeId, Variant) -- at most one row per variant per theme, re-uploading a variant replaces it
// rather than accumulating history.
public class RetroCustomThemeImage
{
    public Guid ThemeId { get; set; }
    public string Variant { get; set; } = "positive"; // positive|negative|action
    public byte[] Data { get; set; } = [];
    public string ContentType { get; set; } = "image/png";
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public RetroCustomTheme Theme { get; set; } = null!;
}
