using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.Personal;

public record CreateTaskRequest(
    [Required][MaxLength(200)] string Title,
    DateOnly? DueDate
);
