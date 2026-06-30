using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.Personal;

public record UpdateTaskRequest(
    [MaxLength(200)] string? Title,
    bool? IsCompleted,
    DateOnly? DueDate
);
