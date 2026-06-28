namespace TeamManager.Api.Application.DTOs.Personal;

public record MemberSkillRatingDto(Guid Id, int Rating, string? Notes, DateOnly RatedAt);
