namespace TeamManager.Api.Application.DTOs.FunRetro;

public record RetroCustomThemeDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = "";
    public Guid CreatedByMemberId { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    // Keyed by variant ("positive"|"negative"|"action") -- null where no image has been uploaded
    // for that variant yet. The value is the image's UpdatedAt, used by the client as a
    // cache-busting version when it fetches the variant's bytes from the image endpoint.
    public Dictionary<string, DateTimeOffset> Variants { get; init; } = [];
}

public record CreateRetroCustomThemeRequest
{
    public string Name { get; init; } = "";
}

public record RenameRetroCustomThemeRequest
{
    public string Name { get; init; } = "";
}
