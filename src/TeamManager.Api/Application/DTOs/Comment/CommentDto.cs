namespace TeamManager.Api.Application.DTOs.Comment;

public class CommentDto
{
    public Guid Id { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public string Text { get; set; } = string.Empty;
    public string? AuthorName { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
