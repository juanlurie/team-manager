using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.SessionDefinition;

public record UpdateSessionDefinitionRequest
{
    [Required, MaxLength(200)]
    public string Name { get; init; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; init; }

    public List<ParticipantDefinition> Participants { get; init; } = [];
}
