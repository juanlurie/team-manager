using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.Personal;

public record AddSkillRatingRequest(
    [Required][Range(1, 5)] int Rating,
    [MaxLength(500)] string? Notes,
    DateOnly? RatedAt
);
