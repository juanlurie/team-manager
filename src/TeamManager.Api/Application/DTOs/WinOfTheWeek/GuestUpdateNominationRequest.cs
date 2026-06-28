using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.WinOfTheWeek;

public record GuestUpdateNominationRequest(
    [Required] Guid NomineeMemberId,
    [Required][MaxLength(200)] string Title,
    [MaxLength(2000)] string? Description
);
