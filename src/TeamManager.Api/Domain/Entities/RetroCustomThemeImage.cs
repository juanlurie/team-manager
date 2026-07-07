namespace TeamManager.Api.Domain.Entities;

// One of up to three variant images for a RetroCustomTheme, mirroring the built-in themes'
// positive/negative/action tone-per-column convention (see RETRO_THEMES in the frontend's
// retro-constants.ts). Keyed by (ThemeId, Variant) -- at most one row per variant per theme,
// re-uploading a variant replaces it rather than accumulating history.
public class RetroCustomThemeImage
{
    public Guid ThemeId { get; set; }
    public string Variant { get; set; } = "positive"; // positive|negative|action
    public byte[] Data { get; set; } = [];
    public string ContentType { get; set; } = "image/png";
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public RetroCustomTheme Theme { get; set; } = null!;
}
