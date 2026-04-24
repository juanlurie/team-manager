namespace TeamManager.Api.Application.DTOs.Comment;

public class CreateCommentRequest
{
    public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public string Text { get; set; } = string.Empty;
    public string? AuthorName { get; set; }
}
