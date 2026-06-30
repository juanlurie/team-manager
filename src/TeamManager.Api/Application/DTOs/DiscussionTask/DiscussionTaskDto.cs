namespace TeamManager.Api.Application.DTOs.DiscussionTask;

public record DiscussionTaskDto
{
    public Guid Id { get; init; }
    public Guid DiscussionPointId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public Guid? TeamMemberId { get; init; }
    public string? AssigneeName { get; init; }
    public bool IsCompleted { get; init; }
    public DateOnly? DueDate { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? CompletedAt { get; init; }
}
