using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.Comment;

public class CreateCommentRequest
{
    [Required][MaxLength(50)]
    public string EntityType { get; set; } = string.Empty;

    [Required]
    public Guid EntityId { get; set; }

    [Required][MaxLength(2000)]
    public string Text { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? AuthorName { get; set; }
}
