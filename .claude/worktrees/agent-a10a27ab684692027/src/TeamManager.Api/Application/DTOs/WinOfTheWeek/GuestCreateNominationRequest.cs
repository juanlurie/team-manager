using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.WinOfTheWeek;

public record GuestCreateNominationRequest(
    [Required] string GuestSessionId,
    [Required][MaxLength(100)] string GuestName,
    [Required] Guid NomineeMemberId,
    [Required][MaxLength(200)] string Title,
    [MaxLength(2000)] string? Description
);
