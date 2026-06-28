namespace TeamManager.Api.Domain.Entities;

public class RetroCard
{
    public Guid Id { get; set; }
    public Guid SprintId { get; set; }
    public string Column { get; set; } = "well";
    public string Text { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public Guid? AuthorId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<RetroVote> Votes { get; set; } = [];
}
