namespace TeamManager.Api.Application.DTOs.CoffeeRun;

public record CoffeeRunMenuTemplateListDto(
    Guid Id,
    string Name,
    int ItemCount,
    DateTimeOffset CreatedAt
);
