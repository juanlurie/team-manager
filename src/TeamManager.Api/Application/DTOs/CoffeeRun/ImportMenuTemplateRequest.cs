using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.CoffeeRun;

public record ImportMenuTemplateRequest(
    [Required][MaxLength(200)] string Name,
    [Required] List<ImportTemplateItemEntry> Items
);

public record ImportTemplateItemEntry(
    [Required][MaxLength(150)] string Name,
    decimal? Price
);
