namespace TeamManager.Api.Domain.Entities;

// A team-wide, reusable board theme -- unlike the fixed built-in themes (space/f1/ocean/
// retro-gaming), these are created and managed by any member with retro access and shared across
// every session, not tied to the session that happened to create them. FunRetroSession.Theme
// stores this Id (as a string) once a session picks it.
public class RetroCustomTheme
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public Guid CreatedByMemberId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    // When set, one of the fixed built-in theme ids (space/f1/ocean/retro-gaming) this theme
    // stands in for -- sessions with Theme == this built-in id render this theme's images instead,
    // without their stored Theme value ever changing. At most one custom theme may claim a given
    // built-in id at a time (enforced by a unique filtered index, see RetroCustomThemeConfiguration).
    public string? OverridesBuiltInId { get; set; }

    public ICollection<RetroCustomThemeImage> Images { get; set; } = [];
}
