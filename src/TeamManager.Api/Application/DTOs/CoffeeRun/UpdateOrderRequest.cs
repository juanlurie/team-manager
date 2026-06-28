using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.CoffeeRun;

public record UpdateOrderRequest(
    [MaxLength(500)] string? Notes,
    [MinLength(1)] List<OrderItemEntry>? Items
);
