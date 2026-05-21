using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.CoffeeRun;

public record UpdateMenuItemRequest(
    [MaxLength(100)] string? Name,
    [Range(0.00, 9999.99)] decimal? Price
);
