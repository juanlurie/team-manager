using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.SessionType;

public record CreateSessionTypeRequest
{
    [Required, MaxLength(100)]
    public string Name { get; init; } = string.Empty;

    [Required, MaxLength(20)]
    public string Color { get; init; } = "#64b5f6";

    public bool IsActive { get; init; } = true;
    public int SortOrder { get; init; }
}
