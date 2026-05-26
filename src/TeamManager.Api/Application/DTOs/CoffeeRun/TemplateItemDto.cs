namespace TeamManager.Api.Application.DTOs.CoffeeRun;

public record TemplateItemDto(Guid Id, string Name, decimal? Price, string? Category, int SortOrder, string? Sizes);
