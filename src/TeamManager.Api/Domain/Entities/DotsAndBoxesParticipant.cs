namespace TeamManager.Api.Domain.Entities;

public class DotsAndBoxesParticipant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SessionId { get; set; }
    public Guid? MemberId { get; set; }
    public string DisplayName { get; set; } = "";
    public int Order { get; set; }
    public int Score { get; set; }
    public bool IsAi { get; set; }

    public DotsAndBoxesSession? Session { get; set; }
    public TeamMember? Member { get; set; }
}
