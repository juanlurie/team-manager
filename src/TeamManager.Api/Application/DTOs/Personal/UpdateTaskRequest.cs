namespace TeamManager.Api.Application.DTOs.Personal;

public record UpdateTaskRequest(string? Title, bool? IsCompleted, DateOnly? DueDate);
