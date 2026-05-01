using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.RetroAction;

public record CreateRetroActionRequest(
    Guid SprintId,
    [MaxLength(500)] string Title,
    string? Notes,
    [MaxLength(200)] string? AssignedTo,
    string Status,
    DateOnly? DueDate
);
