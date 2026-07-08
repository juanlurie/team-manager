namespace TeamManager.Api.Application.DTOs.FunRetro;

public record RetroCustomThemeDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = "";
    public Guid CreatedByMemberId { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    // Keyed by variant -- either a legacy tone ("positive"|"negative"|"action") or a template
    // column key ("well", "start", "wind", ...) -- null where no image has been uploaded for that
    // variant yet. The value is the image's UpdatedAt, used by the client as a cache-busting
    // version when it fetches the variant's bytes from the image endpoint.
    public Dictionary<string, DateTimeOffset> Variants { get; init; } = [];
    // The built-in theme id (space/f1/ocean/retro-gaming) this theme stands in for, if any.
    public string? OverridesBuiltInId { get; init; }
}

public record CreateRetroCustomThemeRequest
{
    public string Name { get; init; } = "";
}

public record RenameRetroCustomThemeRequest
{
    public string Name { get; init; } = "";
}

public record SetOverrideBuiltInRequest
{
    public string? BuiltInId { get; init; }
}
