using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.CoffeeRun;

public record CreateMenuItemRequest(
    [Required][MaxLength(150)] string Name,
    [Required][Range(0.00, 9999.99)] decimal Price,
    [MaxLength(50)] string? Category,
    int? MaxQuantity,
    int SortOrder = 0,
    string? Sizes = null,
    string? Additions = null
);
