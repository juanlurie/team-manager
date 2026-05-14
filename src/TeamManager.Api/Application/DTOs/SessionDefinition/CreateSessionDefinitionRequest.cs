using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.SessionDefinition;

public record CreateSessionDefinitionRequest
{
    [Required, MaxLength(200)]
    public string Name { get; init; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; init; }

    public List<ParticipantDefinition> Participants { get; init; } = [];
}

public record ParticipantDefinition
{
    [Required]
    public Guid TeamMemberId { get; init; }

    [Required]
    public string Role { get; init; } = "Mandatory";
}
