namespace TeamManager.Api.Application.DTOs.Personal;

public record MemberTaskDto(Guid Id, string Title, bool IsCompleted, DateTimeOffset CreatedAt, DateOnly? DueDate, DateTimeOffset? CompletedAt);
