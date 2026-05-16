using System.Text.Json;
using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Domain.Entities;

public class WorkItemEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WorkItemId { get; set; }
    public WorkItemEventType EventType { get; set; }
    public string? FromValue { get; set; }
    public string? ToValue { get; set; }
    public Guid? ActorId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string MetadataJson { get; set; } = "{}";

    public WorkItem WorkItem { get; set; } = null!;

    public T? GetMetadata<T>()
    {
        if (MetadataJson == "{}") return default;
        return JsonSerializer.Deserialize<T>(MetadataJson);
    }

    public void SetMetadata<T>(T value)
    {
        MetadataJson = value is null ? "{}" : JsonSerializer.Serialize(value);
    }
}
