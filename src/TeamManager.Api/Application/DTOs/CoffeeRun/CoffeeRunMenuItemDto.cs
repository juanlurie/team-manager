namespace TeamManager.Api.Application.DTOs.CoffeeRun;

public record CoffeeRunMenuItemDto(
    Guid Id,
    string Name,
    decimal Price,
    string? Category,
    int? MaxQuantity,
    int? RemainingQuantity,
    bool IsAvailable,
    int SortOrder,
    string? Sizes,
    string? Additions
);
