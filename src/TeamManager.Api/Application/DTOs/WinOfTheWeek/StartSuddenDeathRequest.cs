using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.WinOfTheWeek;

public record StartSuddenDeathRequest(
    [Required] List<Guid> TiedNominationIds
);
