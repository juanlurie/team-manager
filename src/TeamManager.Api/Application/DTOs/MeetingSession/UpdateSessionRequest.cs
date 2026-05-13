using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.MeetingSession;

public record UpdateSessionRequest
{
    [Required, MaxLength(200)]
    public string Title { get; init; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; init; }

    [Required]
    public DateOnly Date { get; init; }

    [Required]
    public string StartTime { get; init; } = string.Empty;

    [Required]
    public string EndTime { get; init; } = string.Empty;

    [Required]
    public string Location { get; init; } = string.Empty;
}
