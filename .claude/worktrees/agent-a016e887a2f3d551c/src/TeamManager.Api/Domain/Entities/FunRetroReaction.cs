namespace TeamManager.Api.Domain.Entities;

public class FunRetroReaction
{
    public Guid Id { get; set; }
    public Guid CardId { get; set; }
    public Guid MemberId { get; set; }
    public string Emoji { get; set; } = ""; // 👍 ❤️ 😄
    public FunRetroCard Card { get; set; } = null!;
}
