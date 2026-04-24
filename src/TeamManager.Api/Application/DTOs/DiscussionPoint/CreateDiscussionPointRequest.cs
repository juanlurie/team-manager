namespace TeamManager.Api.Application.DTOs.DiscussionPoint;

public record CreateDiscussionPointRequest(
    string Title,
    string? Notes,
    string Status,
    string Priority,
    Guid? SprintId
);
