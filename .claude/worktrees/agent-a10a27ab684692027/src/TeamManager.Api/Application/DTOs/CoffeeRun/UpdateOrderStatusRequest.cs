using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.CoffeeRun;

public record UpdateOrderStatusRequest(
    [Required] string Status
);
