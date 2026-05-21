namespace TeamManager.Api.Application.DTOs.CoffeeRun;

public record CoffeeRunMenuTemplateDetailDto(
    Guid Id,
    string Name,
    List<CoffeeRunMenuItemDto> Items,
    DateTimeOffset CreatedAt
);
