using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.CoffeeRun;

public record CreateTemplateItemRequest(
    [Required][MaxLength(150)] string Name,
    [Range(0.00, 9999.99)] decimal? Price,
    [MaxLength(50)] string? Category,
    int SortOrder = 0,
    string? Sizes = null
);
