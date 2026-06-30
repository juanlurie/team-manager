using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.SlotLocation;

public record UpdateSlotLocationRequest
{
    [Required, MaxLength(100)]
    public string Name { get; init; } = string.Empty;

    [Required, MaxLength(20)]
    public string Color { get; init; } = string.Empty;

    public bool IsActive { get; init; }
    public int SortOrder { get; init; }
}
