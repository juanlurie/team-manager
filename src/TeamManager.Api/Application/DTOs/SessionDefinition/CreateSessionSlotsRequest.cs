using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.SessionDefinition;

public record CreateSessionSlotsRequest
{
    [Required, MinLength(1)]
    public List<SlotTimeDefinition> Slots { get; init; } = [];
}

public record SlotTimeDefinition
{
    [Required]
    public string Date { get; init; } = string.Empty;

    [Required]
    public string StartTime { get; init; } = string.Empty;

    [Required]
    public string EndTime { get; init; } = string.Empty;

    public Guid? LocationId { get; init; }
}
