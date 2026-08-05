namespace TeamManager.Api.Domain.Entities;

public class WinNominationMember
{
    public Guid WinNominationId { get; set; }
    public Guid TeamMemberId { get; set; }

    public WinNomination WinNomination { get; set; } = null!;
    public TeamMember TeamMember { get; set; } = null!;
}
