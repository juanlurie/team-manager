namespace TeamManager.Api.Application.DTOs.CoffeeRun;

public record CreateMenuTemplateRequest(
    string Name,
    Guid CopyFromRunId
);
