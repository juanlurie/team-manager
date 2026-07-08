namespace TeamManager.Api.Domain.Entities;

// Freeform per-person mind-map/roadmap board -- nodes only, no connectors (unlike
// ProcessFlowSession). One member's own board; not a shared team artifact like retro/process
// flows, though nothing here enforces that beyond the frontend only ever showing "my" boards.
public class PersonalMapSession
{
    public Guid Id { get; set; }
    public string? Title { get; set; }
    public Guid CreatedByMemberId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<PersonalMapNode> Nodes { get; set; } = [];
}
