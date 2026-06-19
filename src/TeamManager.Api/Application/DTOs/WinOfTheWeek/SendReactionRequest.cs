using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.WinOfTheWeek;

public record SendReactionRequest
{
    [Required]
    public Guid NominationId { get; init; }

    [Required]
    [MaxLength(8)]
    public string Emoji { get; init; } = string.Empty;
}
