using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.RetroCard;

public record CreateRetroCardRequest(
    Guid SprintId,
    [MaxLength(20)] string Column,
    [MaxLength(500)] string Text,
    [MaxLength(200)] string AuthorName
);
