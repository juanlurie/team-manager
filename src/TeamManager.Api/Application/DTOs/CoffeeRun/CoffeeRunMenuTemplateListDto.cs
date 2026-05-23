namespace TeamManager.Api.Application.DTOs.CoffeeRun;

public record CoffeeRunMenuTemplateListDto(
    Guid Id,
    string Name,
    string Scope,
    int ItemCount,
    string CreatedByName,
    DateTimeOffset CreatedAt,
    bool IsArchived
);
