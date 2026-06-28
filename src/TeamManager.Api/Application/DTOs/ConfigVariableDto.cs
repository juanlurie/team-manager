namespace TeamManager.Api.Application.DTOs;

public record ConfigVariableDto(
    Guid? Id = null,
    string Key = "",
    string Value = "",
    string? Description = null,
    bool IsSecret = false
);
