using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.CoffeeRun;

public record CreateMenuItemRequest(
    [Required][MaxLength(100)] string Name,
    [Required][Range(0.00, 9999.99)] decimal Price
);
