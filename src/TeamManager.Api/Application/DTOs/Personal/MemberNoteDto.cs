namespace TeamManager.Api.Application.DTOs.Personal;

public record MemberNoteDto(Guid Id, string Text, DateTimeOffset CreatedAt);
