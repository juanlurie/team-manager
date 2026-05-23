namespace TeamManager.Api.Application.DTOs.CoffeeRun;

public record CoffeeRunMenuTemplateDetailDto(
    Guid Id,
    string Name,
    string Scope,
    string CreatedByName,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    List<TemplateItemDto> Items
);
