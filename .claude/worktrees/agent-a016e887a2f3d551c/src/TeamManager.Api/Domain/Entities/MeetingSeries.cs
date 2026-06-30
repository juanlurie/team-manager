using System;
using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Domain.Entities;

public class MeetingSeries
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid CreatedByMemberId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation properties
    public TeamMember CreatedBy { get; set; } = null!;
    public ICollection<MeetingSeriesSlot> Slots { get; set; } = [];
    public ICollection<MeetingSeriesItem> Items { get; set; } = [];
}