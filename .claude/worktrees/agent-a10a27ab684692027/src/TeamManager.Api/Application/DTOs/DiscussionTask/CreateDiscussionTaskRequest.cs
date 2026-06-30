using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.DiscussionTask;

public record CreateDiscussionTaskRequest(
    [Required][MaxLength(300)] string Title,
    [MaxLength(1000)] string? Description,
    Guid? TeamMemberId,
    DateOnly? DueDate
);
