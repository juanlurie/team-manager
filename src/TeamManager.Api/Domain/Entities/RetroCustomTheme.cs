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

    public ICollection<RetroCustomThemeImage> Images { get; set; } = [];
}
