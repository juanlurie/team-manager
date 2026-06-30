using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Infrastructure.Models;

public class TeamMember
{
    public int Id { get; set; }

    [MaxLength(100)]
    public string Name { get; set; } = default!;

    [MaxLength(100)]
    public string Email { get; set; } = default!;

    public bool IsTechLead { get; set; }
    public bool IsTeamLead { get; set; }

    public string? ExternalSubjectId { get; set; }   // populated when we link an external user
    public bool IsActive { get; set; } = true;       // soft delete flag
}
