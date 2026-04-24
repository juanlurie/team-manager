namespace TeamManager.Api.Application.DTOs.Personal;

public record AddSkillRatingRequest(int Rating, string? Notes, DateOnly? RatedAt);
