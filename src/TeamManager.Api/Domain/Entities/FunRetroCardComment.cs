namespace TeamManager.Api.Domain.Entities;

public class FunRetroCardComment
{
    public Guid Id { get; set; }
    public Guid CardId { get; set; }
    public Guid AuthorId { get; set; }
    public string AuthorName { get; set; } = "";
    public string Text { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public FunRetroCard Card { get; set; } = null!;
}
