namespace TeamManager.Api.Application.DTOs.CoffeeRun;

public record CreateMenuTemplateRequest(
    string Name,
    string Scope = "Personal",
    Guid? CopyFromRunId = null,
    Guid? CopyFromTemplateId = null
);
