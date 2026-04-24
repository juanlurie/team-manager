namespace TeamManager.Api.Application.DTOs.PI;

public record CreatePIRequest(
    string Name,
    DateOnly StartDate,
    DateOnly EndDate,
    string? Description
);
