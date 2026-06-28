namespace TeamManager.Api.Domain.Entities;

public class SprintVote
{
    public Guid Id { get; set; }
    public Guid SprintId { get; set; }
    public Guid VoterSprintMemberId { get; set; }
    public Guid NomineeSprintMemberId { get; set; }

    public Sprint Sprint { get; set; } = null!;
    public SprintMember Voter { get; set; } = null!;
    public SprintMember Nominee { get; set; } = null!;
}
