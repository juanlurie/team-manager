using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.SessionDefinition;

public record BookSessionSlotRequest
{
    [MaxLength(500)]
    public string? Notes { get; init; }
}
