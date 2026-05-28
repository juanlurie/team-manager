using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Comment;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/comments")]
public class CommentsController(AppDbContext db) : ControllerBase
{
    [HttpGet("{entityType}/{entityId:guid}")]
    public async Task<IActionResult> GetComments(string entityType, Guid entityId)
    {
        var comments = await db.Comments
            .Where(c => c.EntityType == entityType && c.EntityId == entityId)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new CommentDto
            {
                Id = c.Id,
                EntityType = c.EntityType,
                EntityId = c.EntityId,
                Text = c.Text,
                AuthorName = c.AuthorName,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();

        return Ok(comments);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCommentRequest req)
    {
        var comment = new Comment
        {
            EntityType = req.EntityType,
            EntityId = req.EntityId,
            Text = req.Text,
            AuthorName = req.AuthorName,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.Comments.Add(comment);
        await db.SaveChangesAsync();

        return Ok(new CommentDto
        {
            Id = comment.Id,
            EntityType = comment.EntityType,
            EntityId = comment.EntityId,
            Text = comment.Text,
            AuthorName = comment.AuthorName,
            CreatedAt = comment.CreatedAt
        });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var comment = await db.Comments.FindAsync(id);
        if (comment is null) return NotFound();
        db.Comments.Remove(comment);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
