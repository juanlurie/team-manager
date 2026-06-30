namespace TeamManager.Api.Application.DTOs;

public record AiPromptDto(
    Guid? Id = null,
    string Key = "",
    string Label = "",
    string SystemPrompt = "",
    string UserMessageTemplate = "",
    bool Enabled = true,
    Guid ConnectionId = default,
    string? ConnectionName = null
);

public record TestAiPromptRequest(Dictionary<string, string>? PromptParams = null);

public record TestAiPromptResult(bool Success, string? ExtractedText, string? Error);
