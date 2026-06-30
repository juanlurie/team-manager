namespace TeamManager.Api.Domain.Entities;

public class FunRetroVote
{
    public Guid Id { get; set; }
    public Guid CardId { get; set; }
    public Guid VoterId { get; set; }
    public FunRetroCard Card { get; set; } = null!;
}
