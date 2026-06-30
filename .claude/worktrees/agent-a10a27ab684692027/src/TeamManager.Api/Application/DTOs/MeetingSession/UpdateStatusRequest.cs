using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.MeetingSession;

public record UpdateStatusRequest
{
    [Required]
    public string Status { get; init; } = string.Empty;
}
