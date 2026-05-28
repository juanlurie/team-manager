using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.CoffeeRun;

public record OrderItemEntry(
    [Required] Guid MenuItemId,
    [Required][Range(1, 99)] int Quantity,
    string? Size,
    Dictionary<string, string>? Additions
);

public record CreateOrderRequest(
    [MaxLength(500)] string? Notes,
    [Required][MinLength(1)] List<OrderItemEntry> Items
);
