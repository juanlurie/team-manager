using System;

namespace TeamManager.Api.Domain.Entities;

public class MeetingSeriesItemParticipant
{
    public Guid Id { get; set; }
    public Guid MeetingSeriesItemId { get; set; }
    public Guid TeamMemberId { get; set; }
    public string Role { get; set; } = string.Empty; // "Mandatory" or "Optional"

    // Navigation properties
    public MeetingSeriesItem MeetingSeriesItem { get; set; } = null!;
    public TeamMember TeamMember { get; set; } = null!;
}