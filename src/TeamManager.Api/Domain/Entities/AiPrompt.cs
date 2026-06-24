namespace TeamManager.Api.Domain.Entities;

// One AI use case's prompt text, decoupled from the connection it runs against (URL, auth,
// model, response shape -- see ApiRequestConfig.IsAiConnection). SystemPrompt/UserMessageTemplate
// are plain text, not JSON, specifically so they're easy to edit directly -- the JSON envelope
// (model/max_tokens/etc.) lives once on the connection's BodyTemplate, not duplicated per prompt.
public class AiPrompt
{
    public Guid Id { get; set; }
    // Matches the Action values existing generator services already look up by, e.g.
    // "GenerateQuizQuestion", "GenerateWordleWord".
    public string Key { get; set; } = "";
    public string Label { get; set; } = "";
    public string SystemPrompt { get; set; } = "";
    public string UserMessageTemplate { get; set; } = "";
    public bool Enabled { get; set; } = true;
    public Guid ConnectionId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ApiRequestConfig? Connection { get; set; }
}
