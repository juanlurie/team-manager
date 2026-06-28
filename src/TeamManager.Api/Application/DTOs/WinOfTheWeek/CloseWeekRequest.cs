using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.WinOfTheWeek;

public record CloseWeekRequest(
    [Required] Guid WinnerNominationId
);
