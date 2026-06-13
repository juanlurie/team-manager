using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.WinOfTheWeek;

public record ApplyWowCardRequest
{
    [Required]
    [MaxLength(50)]
    public string Type { get; init; } = string.Empty;
}
