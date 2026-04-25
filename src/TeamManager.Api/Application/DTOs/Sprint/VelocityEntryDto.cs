namespace TeamManager.Api.Application.DTOs.Sprint;

public record VelocityEntryDto(
    Guid SprintId,
    string SprintName,
    Guid? PiId,
    int CompletedItems,
    int TotalItems
);
