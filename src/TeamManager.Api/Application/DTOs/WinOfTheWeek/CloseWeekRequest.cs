using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.WinOfTheWeek;

public record CloseWeekRequest(
    [Required] Guid WinnerNominationId,
    // Optional hero-story theme chosen by the host at close time; flows through to the
    // AiChatWinStory prompt as {theme}. Null/blank falls back to the generator's default.
    string? Theme = null
);
