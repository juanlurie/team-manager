using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.SessionDefinition;

public record UpdateSessionSlotRequest
{
    [Required]
    public string Date { get; init; } = string.Empty;

    [Required]
    public string StartTime { get; init; } = string.Empty;

    [Required]
    public string EndTime { get; init; } = string.Empty;

    public Guid? LocationId { get; init; }
}
