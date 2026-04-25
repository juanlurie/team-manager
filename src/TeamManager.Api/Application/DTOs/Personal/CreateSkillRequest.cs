using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.Personal;

public record CreateSkillRequest(
    [Required][MaxLength(100)] string Name,
    [MaxLength(50)] string? Category
);
