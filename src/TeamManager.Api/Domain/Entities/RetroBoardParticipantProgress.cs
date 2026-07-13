namespace TeamManager.Api.Domain.Entities;

/// <summary>Marks a participant as done with a phase. Drives the facilitator roster ("6/9 done")
/// and lets self-paced members complete phases ahead of the live session. Unique per
/// (participant, phase).</summary>
public class RetroBoardParticipantProgress
{
    public Guid Id { get; set; }
    public Guid RetroBoardParticipantId { get; set; }

    /// <summary>The phase completed (checkin|capture|introduce|vote|discuss|reflect).</summary>
    public string Phase { get; set; } = string.Empty;
    public DateTimeOffset CompletedAt { get; set; } = DateTimeOffset.UtcNow;

    public RetroBoardParticipant? Participant { get; set; }
}
