using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.MeetingSession;

public record CreateSessionRequest
{
    [Required, MaxLength(200)]
    public string Title { get; init; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; init; }

    [Required]
    public string Location { get; init; } = string.Empty;

    [Required]
    public string Type { get; init; } = string.Empty;

    public List<SlotDefinition> Slots { get; init; } = [];
}

public record SlotDefinition
{
    [Required]
    public string Date { get; init; } = string.Empty;

    [Required]
    public string StartTime { get; init; } = string.Empty;

    [Required]
    public string EndTime { get; init; } = string.Empty;

    public string SlotType { get; init; } = "TeamMember";

    public Guid? LocationId { get; init; }

    public Guid? TeamMemberId { get; init; }
}
