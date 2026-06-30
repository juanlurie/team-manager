using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.DiscussionPoint;

public record CreateDiscussionPointRequest(
    [Required][MaxLength(200)] string Title,
    [MaxLength(2000)] string? Notes,
    [Required][MaxLength(50)] string Status,
    [Required][MaxLength(50)] string Priority,
    DateOnly? StartDate,
    DateOnly? TargetDate,
    Guid? TeamMemberId = null
);
