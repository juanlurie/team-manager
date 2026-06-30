namespace TeamManager.Api.Application.DTOs.Personal;

public record MemberSkillDto(Guid Id, string Name, string? Category, List<MemberSkillRatingDto> Ratings);
