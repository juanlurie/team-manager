namespace TeamManager.Api.Domain.Entities;

public class RetroVote
{
    public Guid Id { get; set; }
    public Guid CardId { get; set; }
    public Guid VoterId { get; set; }

    public RetroCard Card { get; set; } = null!;
}
