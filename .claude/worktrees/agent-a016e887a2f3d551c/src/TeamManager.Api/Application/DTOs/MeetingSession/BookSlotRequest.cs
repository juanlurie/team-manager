using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.MeetingSession;

public record BookSlotRequest
{
    [MaxLength(500)]
    public string? Notes { get; init; }
}
