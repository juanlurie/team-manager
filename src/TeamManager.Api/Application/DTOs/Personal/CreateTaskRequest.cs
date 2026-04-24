namespace TeamManager.Api.Application.DTOs.Personal;

public record CreateTaskRequest(string Title, DateOnly? DueDate);
